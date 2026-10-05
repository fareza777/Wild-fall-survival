import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createAndroidDump} from './android-ui-dump.mjs';
const execute=promisify(execFile),adb=process.env.ADB||'C:/Android/Sdk/platform-tools/adb.exe';
const device=process.env.ANDROID_SERIAL;
assert.ok(device,'Set ANDROID_SERIAL to the dedicated QA emulator.');
const version=JSON.parse(await readFile('package.json','utf8')).version;
await mkdir('test-results',{recursive:true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const command=async args=>(await execute(adb,['-s',device,...args],{timeout:45000,maxBuffer:2*1024*1024})).stdout;
const snapshot=await createAndroidDump(command);
const nodes=xml=>(xml.match(/<node\s[^>]+>/g)||[]).map(tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replaceAll('&amp;','&').replaceAll('&quot;','"')])));
const keyboardClicks=[];
async function keyboardClick(label,contains){for(let i=0;i<24;i++){const xml=await dump(),target=nodes(xml).find(n=>n.focused==='true'&&n.enabled==='true'&&[n.text,n['content-desc']].some(t=>contains?(t||'').includes(label):t===label));if(target){await command(['shell','input','keyevent','66']);keyboardClicks.push(label);await delay(1500);return;}await command(['shell','input','keyevent','61']);await delay(350);}throw new Error('Could not focus native control: '+label);}
async function dump(){for(let i=0;i<4;i++){try{const xml=await snapshot();let systemButton;if(xml.includes('System UI isn')&&xml.includes('responding'))systemButton='Wait';else if(xml.includes('package="com.android.systemui"')&&xml.includes('Viewing full screen'))systemButton='Got it';if(systemButton){const n=nodes(xml).find(n=>n.text===systemButton&&n.enabled==='true');if(n){const b=n.bounds.match(/\d+/g).map(Number);await command(['shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2))]);await delay(1500);continue;}}return xml;}catch(e){if(i===3)throw e;}await delay(700);}throw new Error('Accessibility dump unavailable');}
async function tap(label,contains=false){
 let xml='',previous='';for(let i=0;i<12;i++){xml=await dump();const n=nodes(xml).filter(n=>(n.clickable==='true'||n.class==='android.widget.CheckedTextView')&&n.enabled==='true'&&[n.text,n['content-desc']].some(t=>contains?(t||'').includes(label):t===label)).at(-1);if(n&&n.bounds===previous){const b=n.bounds.match(/\d+/g).map(Number);if(b[2]-b[0]<8||b[3]-b[1]<8){await keyboardClick(label,contains);return;}const x=String(Math.round((b[0]+b[2])/2)),y=String(Math.round((b[1]+b[3])/2));await command(['shell','input','touchscreen','swipe',x,y,x,y,'60']);await delay(1500);return;}previous=n?.bounds||'';await delay(500);}
 await writeFile('test-results/android-commerce-failure.xml',xml);throw new Error('Missing native button: '+label+'; '+nodes(xml).filter(n=>n.clickable==='true').map(n=>n.text||n['content-desc']).join(' | '));
}
async function see(label){let xml='';for(let i=0;i<10;i++){xml=await dump();if(xml.includes(label))return xml;await delay(600);}await writeFile('test-results/android-commerce-failure.xml',xml);throw new Error('Missing native text: '+label);}
async function shot(name){await command(['shell','screencap','-p','/sdcard/wildfall-commerce.png']);await command(['pull','/sdcard/wildfall-commerce.png',`test-results/android-commerce-${name}.png`]);}
const logs=()=>command(['logcat','-d','-s','WildfallCommerce','Ads','AndroidRuntime']);
const checks=[];
try{
 await command(['shell','svc','wifi','enable']);
 await command(['shell','am','force-stop','com.ashenvalley.wildfall']);
 await command(['logcat','-c']);
 await command(['shell','am','start','-n','com.ashenvalley.wildfall/.MainActivity']);await delay(2000);
 if((await dump()).includes('Viewing full screen'))await tap('Got it');
 await see('New journey');
 for(let i=0;i<18;i++){const sdk=await logs();if(sdk.includes('Rewarded loaded')&&sdk.includes('Banner loaded')&&sdk.includes('Interstitial loaded'))break;await delay(4000);}
 await see('ADVERTISEMENT');await tap('Remove Ads');await see('US$4.99');
 const store=await dump();const purchase=nodes(store).find(n=>(n.text||'').startsWith('Remove Ads ·'));
 assert.equal(purchase?.enabled,'false','An unpublished product cannot charge or unlock ownership');
 await tap('Restore purchase');await shot('store');await tap('Close dialog');await see('ADVERTISEMENT');
 checks.push('real native Play Billing unavailable product stays disabled; US$4.99 and Restore remain visible');
 await tap('New journey');await tap('Enter the valley');await see('The last flight.');
 assert.ok(!(await dump()).includes('ADVERTISEMENT'),'No banner during cinematic introduction');
 await tap('Skip story');await see('Got it');assert.ok(!(await dump()).includes('ADVERTISEMENT'),'No banner during tutorial');await tap('Got it');await tap('Skip');
 checks.push('native banner is hidden throughout story and guided first steps');
 let sdk='';for(let i=0;i<18;i++){sdk=await logs();if(sdk.includes('Rewarded loaded')&&sdk.includes('Banner loaded')&&sdk.includes('Interstitial loaded'))break;await delay(4000);}
 await writeFile('test-results/android-commerce-sdk.log',sdk);
 assert.match(sdk,/AdMob ready; ad audio muted/);assert.doesNotMatch(sdk,/FATAL EXCEPTION/);
 assert.match(sdk,/Banner loaded/);await see('ADVERTISEMENT');await shot('banner');
 checks.push('actual Google demo adaptive banner loaded above the game; SDK ad audio is muted before requests');
 await command(['shell','input','keyevent','4']);await tap('Supplies & Remove Ads');await see('Watch ad · claim pack');
 await tap('Watch ad · claim pack');await delay(700);await shot('rewarded');
 assert.match(await logs(),/Rewarded shown/);
 // Wait for the real SDK earn callback, never synthesize a successful ad.
 for(let i=0;i<15;i++){if((await logs()).includes('SDK reward earned'))break;await delay(4000);}
 assert.match(await logs(),/SDK reward earned/);
 let closed=false;for(let i=0;i<5;i++){const xml=await dump(),n=nodes(xml).find(n=>n.clickable==='true'&&[n.text,n['content-desc']].some(t=>/^(Close|Close ad|Dismiss|Skip video|×|x)$/i.test(t||'')));if(n){await tap(n.text||n['content-desc']);closed=true;break;}await command(['shell','input','keyevent','4']);await delay(1000);if((await dump()).includes('Your optional supply pack is ready.')){closed=true;break;}}
 assert.ok(closed,'Completed SDK ad can close');await see('Your optional supply pack is ready.');await see('Continue');await shot('earned');await tap('Continue',true);
 await command(['shell','input','keyevent','4']);await tap('Supplies & Remove Ads');await see('claimed. Return tomorrow.');await shot('daily-limit');await tap('Close dialog');
 checks.push('real rewarded SDK callback grants a held ration/water result once; same-day claim is disabled');
 // Eight real equipment operations meet the configured natural-break cadence without expending food.
 await tap('Pack');await tap('All');await tap('Gear');for(let i=0;i<8;i++)await tap(i%2?'Equip Survival knife':'Unequip Survival knife');
 await command(['shell','input','keyevent','4']);await tap('Main menu');await delay(1000);
 assert.match(await logs(),/Interstitial shown/);await shot('interstitial');
 for(let i=0;i<10;i++){const xml=await dump(),n=nodes(xml).find(n=>n.clickable==='true'&&[n.text,n['content-desc']].some(t=>/^(Close|Close ad|Dismiss|×|x)$/i.test(t||'')));if(n){await tap(n.text||n['content-desc']);break;}await command(['shell','input','keyevent','4']);await delay(2000);}
 await see('New journey');checks.push('actual Google demo interstitial appears only on an eligible return to the menu and closes back to that menu');
 const final=await logs();assert.doesNotMatch(final,/FATAL EXCEPTION/);
 await writeFile('test-results/android-commerce-sdk.log',final);
 await writeFile('test-results/android-commerce-report.json',JSON.stringify({passed:true,version,device,checks,keyboardClicks,actualSDKAds:true,livePurchase:false,livePurchaseReason:'Google Play application/product configuration and an eligible billing test account are required; live transactions were not attempted.'},null,2));console.log(JSON.stringify({passed:true,checks},null,2));
}catch(error){await writeFile('test-results/android-commerce-sdk.log',await logs());await shot('failure').catch(()=>{});throw error;}
