import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const execute=promisify(execFile),adb=process.env.ADB||'C:/Android/Sdk/platform-tools/adb.exe',device=process.env.ANDROID_SERIAL||'emulator-5580';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let uiDumpRetries=0;
const command=async args=>(await execute(adb,['-s',device,...args],{timeout:30000,maxBuffer:2*1024*1024})).stdout;
function nodes(xml){return (xml.match(/<node\s[^>]+>/g)||[]).map(tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replaceAll('&amp;','&').replaceAll('&quot;','"')])));}
async function dump(){
  let lastError;
  for(let i=0;i<4;i++){
    try{
      await command(['shell','uiautomator','dump','/sdcard/wildfall-qa.xml']);
      const xml=await command(['shell','cat','/sdcard/wildfall-qa.xml']);
      if(nodes(xml).some(n=>n.text||n['content-desc']))return xml;
    }catch(error){
      // Retry a killed helper; never use an accessibility file from a failed dump.
      if(error.code!==137)throw error;
      lastError=error;uiDumpRetries++;
    }
    await delay(700);
  }
  if(lastError)throw lastError;
  throw new Error('Android accessibility tree did not become ready');
}
async function tap(label,{contains=false}={}){
  let xml,candidates=[];
  for(let attempt=0;attempt<10&&!candidates.length;attempt++){
    xml=await dump();
    candidates=nodes(xml).filter(n=>n.clickable==='true'&&n.enabled==='true'&&((contains?(n.text||'').includes(label):n.text===label)||(contains?(n['content-desc']||'').includes(label):n['content-desc']===label)));
    if(!candidates.length)await delay(500);
  }
  if(!candidates.length){await writeFile('test-results/android-failed-ui.xml',xml);throw new Error(`No Android button: ${label}. Available: ${nodes(xml).filter(n=>n.clickable==='true').map(n=>n.text||n['content-desc']).join(' | ')}`);}
  const node=candidates.at(-1),v=node.bounds.match(/\d+/g).map(Number);
  await command(['shell','input','tap',String(Math.floor((v[0]+v[2])/2)),String(Math.floor((v[1]+v[3])/2))]);
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
  await tap('New journey');await tap('Enter the valley');
  await see('The last flight.');await screenshot('android-prologue');await tap('Skip story');await tap('Got it');await screenshot('android-guided');await tap('Skip');
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
  const activities=await command(['shell','dumpsys','activity','activities']);
  assert.ok(/ChooserActivity|ResolverActivity/.test(activities),'Android share chooser must open');
  await screenshot('android-share');
  await command(['shell','input','keyevent','4']);await delay(500);
  await tap('Rate');await tap('4 stars');await see('4/5');await tap('Close dialog');
  const logs=await command(['logcat','-d','-t','700']);
  assert.ok(!/FATAL EXCEPTION[\s\S]{0,300}com\.ashenvalley\.wildfall/.test(logs),'No native game crash');
  const api=Number((await command(['shell','getprop','ro.build.version.sdk'])).trim());
  await writeFile('test-results/android-report.json',JSON.stringify({passed:true,version:'1.2.0',device,api,uiDumpRetries,checks:['offline-menu','new-game-prologue','highlighted-guide','gather','unread-result-after-force-stop','five-tabs','settings','save-after-force-stop','native-back','share-chooser','local-rating'],timeAfterReload:'08:45'},null,2));
  console.log('Android QA passed: offline gameplay, tabs, settings, native Back, force-stop persistence, share chooser, local rating.');
}finally{await command(['shell','svc','wifi','enable']);}
