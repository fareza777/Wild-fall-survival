import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createAndroidDump} from './android-ui-dump.mjs';
const run=promisify(execFile),adb=process.env.ADB||'C:/Android/Sdk/platform-tools/adb.exe',serial=process.env.ANDROID_SERIAL;
assert.ok(serial,'Use a dedicated Android QA emulator.');await mkdir('test-results',{recursive:true});
const command=async args=>(await run(adb,['-s',serial,...args],{timeout:45000,maxBuffer:3e6})).stdout;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(let i=0;i<90;i++){try{if((await command(['shell','getprop','sys.boot_completed'])).trim()==='1')break;}catch{}await delay(1500);}
if(process.env.ANDROID_QA_APK)await command(['install','-r',process.env.ANDROID_QA_APK]);
await command(['shell','wm','density','280']);await command(['shell','svc','wifi','enable']);
await command(['shell','am','force-stop','com.ashenvalley.wildfall']);await command(['shell','am','start','-n','com.ashenvalley.wildfall/.MainActivity']);
const snapshot=await createAndroidDump(command);
const dump=async()=>{for(let i=0;i<4;i++){try{const xml=await snapshot();if(xml.includes('System UI isn')&&xml.includes('responding')){const wait=nodes(xml).find(x=>x.text==='Wait');if(wait){const b=bounds(wait);await command(['shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2))]);await delay(1500);continue;}}return xml;}catch(error){if(i===3)throw error;await delay(1500);}}throw new Error('Native snapshot did not become ready');};
const nodes=xml=>(xml.match(/<node\s[^>]+>/g)||[]).map(tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]])));
const bounds=n=>n.bounds.match(/\d+/g).map(Number);
const layouts=[];await delay(8000);
for(const mode of ['threebutton','gestural']){
 await command(['shell','cmd','overlay','enable-exclusive','--category','--user','0',`com.android.internal.systemui.navbar.${mode}`]);await delay(2000);
 let xml,ad,web;
 for(let i=0;i<30;i++){await delay(2000);xml=await dump();await writeFile('test-results/android-layout.xml',xml);const n=nodes(xml);if(xml.includes('Viewing full screen')){const tip=n.find(x=>x.text==='Got it');if(tip){const b=bounds(tip),x=String(Math.round((b[0]+b[2])/2)),y=String(Math.round((b[1]+b[3])/2));await command(['shell','input','touchscreen','swipe',x,y,x,y,'60']);continue;}}ad=n.find(x=>(x.text||'').startsWith('ADVERTISEMENT'));web=n.find(x=>x.class==='android.webkit.WebView'&&x.package==='com.ashenvalley.wildfall'&&bounds(x)[3]-bounds(x)[1]>300);if(ad&&web)break;}
 assert.ok(ad&&web,'Real native banner and game WebView must be visible');
 const banner=bounds(ad),content=bounds(web);assert.ok(banner[3]<=content[1],'The actual SDK banner must sit ABOVE the game, away from bottom navigation');
 assert.ok(banner[1]>0,'Banner must avoid the Android status area');
 const windows=await command(['shell','dumpsys','window','displays']);await writeFile(`test-results/android-layout-${mode}-window.txt`,windows);
 const bars=[...windows.matchAll(/(?:type|mType)=navigationBars[^\r\n]{0,100}?(?:frame|mFrame)=\[(\d+),(\d+)\]\[(\d+),(\d+)\]/g)];
 assert.ok(bars.length,'Android must report navigation-bar geometry');const navTop=Math.min(...bars.map(m=>Number(m[2])).filter(n=>n>content[1]));assert.ok(content[3]<=navTop,'The game must stop above the native navigation area');
 await command(['shell','screencap','-p','/data/local/tmp/wildfall-layout.png']);await command(['pull','/data/local/tmp/wildfall-layout.png',`test-results/android-layout-${mode}.png`]);
 layouts.push({mode,banner,content,nativeNavigationTop:navTop});
}
const version=JSON.parse(await readFile('package.json','utf8')).version,report={passed:true,version,serial,layouts};await writeFile('test-results/android-layout-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
