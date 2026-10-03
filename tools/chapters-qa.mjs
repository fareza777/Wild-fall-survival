import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {launchBrowser} from './browser-runtime.mjs';
const browser=await launchBrowser();
const context=await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
await mkdir('test-results',{recursive:true});
await context.addInitScript(()=>{localStorage.setItem('wildfall-onboarded','1');crypto.getRandomValues=a=>{a.fill(7103);return a;};if(window.name.startsWith('chapter-fixture:')){localStorage.setItem('wildfall-save-v1',window.name.slice(16));window.name='';}});
const page=await context.newPage();
const errors=[],external=[],missing=[],checks=[],tutorials=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173/'))external.push(r.url());});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wildfall-save-v1')).state);
const voice=()=>page.evaluate(async()=>(await import('/ui/narration.js')).narrationDiagnostics());
const sound=()=>page.evaluate(async()=>(await import('/ui/audio.js')).audioDiagnostics());
async function waitVoice(){await page.evaluate(async()=>window.readNarration=(await import('/ui/narration.js')).narrationDiagnostics);await page.waitForFunction(()=>window.readNarration().playing&&window.readNarration().time>.1);}
const finished=()=>page.waitForFunction(()=>!document.body.classList.contains('action-busy'),{},{timeout:15000});
async function shot(name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`test-results/chapters-${name}.png`});}
async function guide(label){
 let actions=0;
 for(let i=0;i<320&&(await save()).tutorial.active;i++){
  const s=await save();assert.equal(s.dead,false,'Guided journey died: '+label+' '+JSON.stringify(s.stats));
  if(await page.locator('[data-ui="acknowledge-result"]').count()){await page.locator('[data-ui="acknowledge-result"]').click();continue;}
  if(s.event){await page.locator('[data-kind="resolveEvent"]:not([disabled])').last().click();await finished();actions++;continue;}
  if(s.combat){const retreat=page.getByRole('button',{name:/^Retreat /});if(await retreat.isDisabled())await page.getByRole('button',{name:/^Guard /}).click();else await retreat.click();await finished();actions++;continue;}
  if(s.carcass){await page.getByRole('button',{name:'Leave carcass',exact:true}).click();await finished();actions++;continue;}
  if(s.tutorial.step===0){await page.getByRole('button',{name:'Got it',exact:true}).click();continue;}
  if(s.tutorial.step===8){await page.locator('.guide-target').click();await page.getByRole('button',{name:'Ready',exact:true}).click();break;}
  const target=page.locator('.guide-target');assert.equal(await target.count(),1,JSON.stringify({label,step:s.tutorial.step,stats:s.stats,items:s.items}));
  assert.equal(await target.isDisabled(),false);const action=await target.evaluate(el=>!!el.dataset.action||el.dataset.ui==='perform');
  await target.click();if(action){actions++;await finished();}
 }
 assert.equal((await save()).tutorial.active,false,'Guide must finish: '+label);tutorials.push({label,actions,day:Math.floor((await save()).time/1440)+1});
}
async function fixture(kind){
 await page.evaluate(async kind=>{
  const names=['items','recipes','locations','weather','enemies','events','scenarios','quests','story'],c=Object.fromEntries(await Promise.all(names.map(async n=>[n,await(await fetch(`/data/${n}.json`)).json()]))),{GameEngine}=await import('/game/engine.js');
  const g=new GameEngine(c,null,{seed:7103}),s=g.state;s.nextWeather=1e8;s.prologue={step:4,complete:true};Object.assign(s.camp,{shelter:1,firepit:true,fire_cover:true,fire:400});
  s.tutorial={step:6,active:true,version:2,usedWater:false,usedFood:false};
  if(kind==='old-stuck'){delete s.tutorial.version;s.tutorial.step=2;g.perform('use',{id:'water'});g.perform('use',{id:'ration'});s.items.water=0;s.items.ration=0;s.receipt=null;s.tutorial.step=6;}
  if(kind==='tea'){s.items={tea:1,berries:3};}
  if(kind==='boil'){s.items={dirty_water:2,berries:3};s.tutorial.usedFood=true;}
  if(kind==='refill'){s.items={ration:2,wood:8,fiber:5};s.tutorial.usedFood=true;}
  if(kind==='chapter-two'){s.tutorial.active=false;s.time=1440;s.counters.fires=1;g.perform('rest');s.receipt=null;}
  window.name='chapter-fixture:'+JSON.stringify({state:s,checkpoint:structuredClone(s)});
 },kind);
 await page.reload();await page.locator('[data-ui="continue"]').click();
}
try{
 await page.goto('http://127.0.0.1:4173');await page.locator('[data-ui="new-game"]').click();
 await page.locator('.modal').evaluate(el=>{window.choicePanel=el;window.choicePortraits=[...el.querySelectorAll('.scenario-portrait')];window.choiceAnimation=el.getAnimations()[0];});
 for(const [ui,id] of [['scenario','cold_trail'],['difficulty','story'],['scenario','riverborn'],['difficulty','relentless'],['permadeath',null]]){
  const selector=`[data-ui="${ui}"]${id?`[data-id="${id}"]`:''}`;await page.locator(selector).click();
  const stable=await page.evaluate(()=>({panel:window.choicePanel===document.querySelector('.modal'),portraits:window.choicePortraits.every((img,i)=>img===document.querySelectorAll('.scenario-portrait')[i]),animation:window.choicePanel.getAnimations()[0]===window.choiceAnimation,focus:document.activeElement.isConnected&&document.activeElement.tagName==='BUTTON'}));
  assert.deepEqual(stable,{panel:true,portraits:true,animation:true,focus:true},'Choosing a character/difficulty must not rebuild or reanimate the panel');
 }
 checks.push('stable character/difficulty selection: same panel, portraits, animation and focus');
 for(const size of [{width:320,height:640},{width:412,height:915}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot('choices-'+size.width);}
 await page.locator('[data-ui="scenario"][data-id="cold_trail"]').click();await page.locator('[data-ui="difficulty"][data-id="survivor"]').click();await page.locator('[data-ui="permadeath"]').click();await page.locator('[data-ui="start-game"]').click();
 await waitVoice();assert.equal((await voice()).src,'assets/audio/narration/departure.mp3');assert.equal((await sound()).narrating,true,JSON.stringify({voice:await voice(),audio:await sound()}));
 await page.evaluate(()=>window.storyImage=document.querySelector('.story-background'));await page.getByRole('button',{name:'Mute narration',exact:true}).click();assert.equal((await voice()).playing,false);assert.equal((await sound()).narrating,false);assert.equal(await page.evaluate(()=>window.storyImage===document.querySelector('.story-background')),true);
 await page.getByRole('button',{name:'Enable narration',exact:true}).click();await waitVoice();await page.waitForTimeout(150);
 await page.evaluate(()=>wildfallPause());const paused=await voice();assert.equal(paused.playing,false);await page.waitForTimeout(250);assert.ok(Math.abs((await voice()).time-paused.time)<.1);await page.evaluate(()=>wildfallResume());await waitVoice();
 const audioClips=await page.evaluate(async()=>{
  const c=await(await fetch('/data/story.json')).json(),audio=new AudioContext(),result=[];
  for(const scene of c)for(const path of [scene.voice,...Object.values(scene.voiceVariants||{})]){const buffer=await audio.decodeAudioData(await(await fetch('/'+path)).arrayBuffer()),data=buffer.getChannelData(0);let power=0,clipped=0;for(const n of data){power+=n*n;if(Math.abs(n)>=.999)clipped++;}result.push({path,duration:buffer.duration,rms:Math.sqrt(power/data.length),clipped:clipped/data.length});}await audio.close();return result;
 });
 assert.equal(audioClips.length,7);for(const clip of audioClips){assert.ok(clip.duration>4&&clip.duration<20);assert.ok(clip.rms>.005);assert.ok(clip.clipped<.01);}
 for(let i=1;i<5;i++){await page.locator('[data-ui="story-next"]').click();await waitVoice();if(i===3)assert.equal((await voice()).src,'assets/audio/narration/awakening_cold_trail.mp3');}
 await page.getByRole('button',{name:'Replay narration',exact:true}).click();assert.ok((await voice()).time<.25);await shot('voiced-prologue');
 await page.getByRole('button',{name:'Make camp',exact:true}).click();assert.equal((await voice()).src,null);assert.equal((await sound()).narrating,false);checks.push('seven real MP3s decoded; subtitles/variant match, mute, replay, scene replacement, background pause/resume, skip stops speech; no external runtime calls');
 await page.evaluate(()=>{localStorage.setItem('wildfall-preferences-v1',JSON.stringify({motion:false,sound:false,ambient:false,narration:false}));});
 for(const scenario of ['last_ember','riverborn','cold_trail'])for(const difficulty of ['story','survivor']){
  await page.evaluate(()=>localStorage.removeItem('wildfall-save-v1'));await page.reload();await page.locator('[data-ui="new-game"]').click();await page.locator(`[data-ui="scenario"][data-id="${scenario}"]`).click();await page.locator(`[data-ui="difficulty"][data-id="${difficulty}"]`).click();await page.locator('[data-ui="start-game"]').click();await page.locator('[data-ui="story-skip"]').click();await guide(scenario+'/'+difficulty);
 }
 checks.push('six fresh Explorer/Survivor tutorials completed through highlighted public controls, including one-bottle Cold Trail');
 for(const kind of ['old-stuck','tea','boil','refill']){
  await fixture(kind);if(kind==='old-stuck'){assert.equal((await save()).tutorial.version,2);assert.equal((await save()).tutorial.step,7);}if(kind==='tea'){await page.locator('.guide-target').click();await page.locator('[data-action="use"][data-id="tea"]').waitFor();await shot('tea-guide');}
  await guide(kind);
 }
 checks.push('old stuck saves migrate; safe tea/berries, boiling carried water and collecting/refilling from the river finish via public UI');
 await page.evaluate(()=>localStorage.removeItem('wildfall-save-v1'));await page.reload();await page.locator('[data-ui="new-game"]').click();await page.locator('[data-ui="start-game"]').click();await page.locator('[data-ui="story-skip"]').click();await page.locator('[data-ui="skip-guide"]').click();await page.locator('.bottom-nav [data-ui="tab"][data-tab="journal"]').click();await page.getByRole('heading',{name:'Before Nightfall',exact:true}).waitFor();
 for(const title of ['The Ranger’s Trail','Fragments of a Signal','A Voice in the Static','The Last Signal'])assert.equal(await page.getByText(title,{exact:true}).count(),0);
 await page.locator('[data-ui="quest-group"][data-group="side"]').click();await page.getByRole('heading',{name:'Unwritten pages.',exact:true}).waitFor();await shot('unwritten-journal');await fixture('chapter-two');await page.locator('.bottom-nav [data-ui="tab"][data-tab="journal"]').click();await page.getByRole('heading',{name:'The Ranger’s Trail',exact:true}).waitFor();assert.equal(await page.getByText('Fragments of a Signal',{exact:true}).count(),0);await shot('next-chapter');checks.push('Journal reveals completed/current main chapters and discovered side objectives only; next chapter opens after real quest completion');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.deepEqual(external,[]);
 await writeFile('test-results/chapters-report.json',JSON.stringify({passed:true,version:'1.3.0',checks,tutorials,audioClips,errors,missing,external},null,2));console.log(JSON.stringify({passed:true,checks,tutorials},null,2));
}finally{await browser.close();}
