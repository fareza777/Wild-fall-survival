import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createAndroidDump} from './android-ui-dump.mjs';
const execute=promisify(execFile),adb=process.env.ADB||'C:/Android/Sdk/platform-tools/adb.exe',device=process.env.ANDROID_SERIAL||'emulator-5580';
const version=JSON.parse(await readFile('package.json','utf8')).version;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let uiDumpRetries=0,systemUiWaits=0;
const keyboardClicks=[];
const command=async args=>(await execute(adb,['-s',device,...args],{timeout:30000,maxBuffer:2*1024*1024})).stdout;
const snapshot=await createAndroidDump(command);
function nodes(xml){return (xml.match(/<node\s[^>]+>/g)||[]).map(tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replaceAll('&amp;','&').replaceAll('&quot;','"')])));}
async function dump(){
  let lastError;
  for(let i=0;i<4;i++){
    try{
      const xml=await snapshot();
      // A navigation-mode switch can stall the emulator's System UI. Never dismiss a game ANR.
      if(xml.includes("System UI isn't responding")){
        const wait=nodes(xml).find(n=>n.text==='Wait'&&n['resource-id']==='android:id/aerr_wait');
        if(wait){const b=wait.bounds.match(/\d+/g).map(Number),x=String(Math.floor((b[0]+b[2])/2)),y=String(Math.floor((b[1]+b[3])/2));await command(['shell','input','touchscreen','swipe',x,y,x,y,'60']);systemUiWaits++;await delay(1500);continue;}
      }
      // A valid empty WebView tree is a loading frame; callers still wait for their exact label.
      if(nodes(xml).length)return xml;
    }catch(error){
      // Retry a killed helper; never use an accessibility file from a failed dump.
      lastError=error;uiDumpRetries++;
    }
    await delay(700);
  }
  if(lastError)throw lastError;
  throw new Error('Android accessibility tree did not become ready');
}
async function keyboardClick(label,contains){
  for(let i=0;i<24;i++){
    const xml=await dump(),target=nodes(xml).find(n=>n.focused==='true'&&n.enabled==='true'&&[n.text,n['content-desc']].some(t=>contains?(t||'').includes(label):t===label));
    if(target){await command(['shell','input','keyevent','66']);keyboardClicks.push(label);await delay(1500);return;}
    await command(['shell','input','keyevent','61']);await delay(350);
  }
  throw new Error('Could not focus native control: '+label);
}
async function tap(label,{contains=false}={}){
  let xml,candidates=[],previous='';
  for(let attempt=0;attempt<12;attempt++){
    xml=await dump();
    candidates=nodes(xml).filter(n=>(n.clickable==='true'||n.class==='android.widget.CheckedTextView')&&n.enabled==='true'&&((contains?(n.text||'').includes(label):n.text===label)||(contains?(n['content-desc']||'').includes(label):n['content-desc']===label)));
    if(candidates.length&&candidates.at(-1).bounds===previous)break;
    previous=candidates.at(-1)?.bounds||'';
    candidates=[];
    await delay(500);
  }
  if(!candidates.length){await writeFile('test-results/android-failed-ui.xml',xml);throw new Error(`No Android button: ${label}. Available: ${nodes(xml).filter(n=>n.clickable==='true').map(n=>n.text||n['content-desc']).join(' | ')}`);}
  const node=candidates.at(-1),v=node.bounds.match(/\d+/g).map(Number);
  // WebView sometimes reports a clipped footer with zero-height bounds. Use real keyboard focus.
  if(v[2]-v[0]<8||v[3]-v[1]<8){await keyboardClick(label,contains);return;}
  const x=String(Math.floor((v[0]+v[2])/2)),y=String(Math.floor((v[1]+v[3])/2));
  // A short stationary gesture avoids a queued tap becoming a long press on a loaded emulator.
  await command(['shell','input','touchscreen','swipe',x,y,x,y,'60']);
  await delay(1500);
}
async function see(label){
  let xml='';for(let i=0;i<10;i++){xml=await dump();if(xml.includes(label))return xml;await delay(500);}
  await writeFile('test-results/android-failed-ui.xml',xml);
  assert.ok(xml.includes(label),`Native UI must show ${label}`);return xml;
}
async function screenshot(name){await command(['shell','screencap','-p','/sdcard/wildfall-qa.png']);await command(['pull','/sdcard/wildfall-qa.png',`test-results/${name}.png`]);}
await command(['shell','svc','wifi','disable']);
try{
  // Restart offline so an already loaded SDK banner cannot affect the offline UI run.
  await command(['shell','am','force-stop','com.ashenvalley.wildfall']);
  await command(['shell','am','start','-n','com.ashenvalley.wildfall/.MainActivity']);await delay(1500);
  const initial=await dump();
  if(initial.includes('package="com.android.systemui"')&&initial.includes('Viewing full screen'))await tap('Got it');
  await tap('New journey');await tap('Riverborn',{contains:true});await tap('Last Ember',{contains:true});await tap('Explorer');await tap('Survivor');await screenshot('android-choices');await tap('Enter the valley');
  await see('NARRATING');await see('The last flight.');await screenshot('android-prologue');await tap('Mute narration');await see('VOICE OFF');await tap('Enable narration');await tap('Replay narration');await see('NARRATING');await tap('Skip story');await tap('Got it');await screenshot('android-guided');await tap('Skip');
  assert.ok(!(await dump()).includes('Guided survival tutorial'),'Skip must close the guide before gameplay');
  await see('Last Camp');
  await screenshot('android-game');
  await tap('Gather',{contains:true});
  await see('ACTION COST');await screenshot('android-results');
  await command(['shell','am','force-stop','com.ashenvalley.wildfall']);
  await command(['shell','am','start','-n','com.ashenvalley.wildfall/.MainActivity']);await delay(1200);
  await tap('Continue',{contains:true});await see('ACTION COST');await tap('Continue',{contains:true});
  const after=await see('08:45');
  for(const label of ['Explore','Pack','Craft','Journal','Camp']){await tap(label);await dump();}
  await tap('Settings');await see('Sound effects');await screenshot('android-settings');
  await tap('Close dialog');
  await command(['shell','am','force-stop','com.ashenvalley.wildfall']);
  await command(['shell','am','start','-n','com.ashenvalley.wildfall/.MainActivity']);await delay(1200);
  await tap('Continue',{contains:true});await see('08:45');
  // Native Back pauses the game; opening the chooser never sends a message.
  await command(['shell','input','keyevent','4']);await delay(400);await tap('Main menu');
  await tap('Share');
  let activities='';for(let i=0;i<10;i++){activities=await command(['shell','dumpsys','activity','activities']);if(/ChooserActivity|ResolverActivity/.test(activities))break;await delay(500);}
  assert.ok(/ChooserActivity|ResolverActivity/.test(activities),'Android share chooser must open');
  await screenshot('android-share');
  await command(['shell','input','keyevent','4']);await delay(500);
  await tap('Rate');await tap('4 stars');await see('4/5');await tap('Close dialog');
  const logs=await command(['logcat','-d','-t','700']);
  assert.ok(!/FATAL EXCEPTION[\s\S]{0,300}com\.ashenvalley\.wildfall/.test(logs),'No native game crash');
  const api=Number((await command(['shell','getprop','ro.build.version.sdk'])).trim());
  await writeFile('test-results/android-report.json',JSON.stringify({passed:true,version,device,api,uiDumpRetries,systemUiWaits,keyboardClicks,checks:['offline-menu','stable-character-difficulty-controls','new-game-prologue','offline-narration-playing-mute-replay','highlighted-guide','gather','unread-result-after-force-stop','five-tabs','settings','save-after-force-stop','native-back','share-chooser','local-rating'],timeAfterReload:'08:45'},null,2));
  console.log('Android QA passed: offline gameplay, tabs, settings, native Back, force-stop persistence, share chooser, local rating.');
}finally{await command(['shell','svc','wifi','enable']);}
