// Real WILDFALL UI, controlled marketing save fixtures. No reconstructed gameplay UI.
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launchBrowser} from '../tools/browser-runtime.mjs';
const root=new URL('./',import.meta.url);
await mkdir(new URL('captures/',root),{recursive:true});
await mkdir(new URL('recordings/',root),{recursive:true});
const browser=await launchBrowser();
const manifest={gameVersion:'1.4.1',viewport:{width:412,height:760},deviceScaleFactor:2,fixtureDisclosure:'Controlled saves in the actual game. All displayed UI and animations are captured from v1.4.1 without UI alteration.',shots:[],clips:[],errors:[]};
async function makePage(mode,record=false){
 const context=await browser.newContext({viewport:manifest.viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true,...(record?{recordVideo:{dir:fileURLToPath(new URL('recordings/',root)),size:{width:824,height:1520}}}:{})});
 await context.addInitScript(()=>{localStorage.setItem('wildfall-onboarded','1');localStorage.setItem('wildfall-preferences-v1',JSON.stringify({sound:false,ambient:false,narration:false,motion:true}));if(window.name.startsWith('marketing:')){localStorage.setItem('wildfall-save-v1',window.name.slice(10));window.name='';}});
 const start=Date.now(),page=await context.newPage();page.on('pageerror',e=>manifest.errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');
 await page.evaluate(async mode=>{
  const names=['items','recipes','locations','weather','enemies','events','scenarios','quests','story'];
  const c=Object.fromEntries(await Promise.all(names.map(async n=>[n,await(await fetch(`/data/${n}.json`)).json()])));
  const {GameEngine}=await import('/game/engine.js'),{beginCombat}=await import('/game/combat.js');
  const g=new GameEngine(c,null,{seed:7103}),s=g.state;
  s.prologue={step:4,complete:true};s.tutorial={step:8,active:false,usedFood:true,usedWater:true,version:2};s.nextWeather=1e8;
  s.time=1440+16*60;s.stats={health:94,stamina:76,calories:1835,hydration:1780,temperature:36.7,fatigue:22,injury:0,sickness:0};
  s.items={wood:6,stone:4,fiber:5,scrap:4,water:2,ration:2,herbs:2,dirty_water:2,raw_meat:1};
  Object.assign(s.camp,{shelter:1,firepit:true,fire_cover:true,fire:320});s.counters.fires=1;s.quests.completed=['first_night'];
  s.discovered=['camp','forest','river','cabin'];s.visited=['camp','forest','river'];s.explored={forest:2,river:1};
  for(const id of ['axe','spear','cooking_pot','fire_drill','canteen','roasting_spit'])s.gear.push({id,uid:`${id}-market`,durability:c.items[id].durability,origin:'crafted',uses:0});
  s.equipment.tool='axe-market';s.equipment.weapon='spear-market';s.nextGear=20;
  if(mode==='night'){s.time=1440+21*60;s.weather='rain';}
  if(mode==='gather'){s.location='forest';s.items={wood:2,stone:2,fiber:2,water:2,ration:2};}
  if(mode==='battle'){s.location='forest';beginCombat(s,c,'wolf');}
  if(mode==='journal'){s.time=3*1440+10*60;s.flags.journal=true;s.quests.completed=['first_night','old_ranger'];s.discovered=['camp','forest','river','cabin','mountain','ruins','cave'];s.visited=['camp','forest','river','cabin'];}
  window.name='marketing:'+JSON.stringify({state:s,checkpoint:structuredClone(s)});
 },mode);
 await page.reload();await page.locator('[data-ui="continue"]').click();
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode().catch(()=>{})));});
 await page.waitForTimeout(450);
 return {page,context,start};
}
async function shot(page,name){await page.screenshot({path:fileURLToPath(new URL(`captures/${name}.png`,root))});manifest.shots.push(name);}
async function finish(page){await page.waitForFunction(()=>!document.body.classList.contains('action-busy'));}
try{
 for(const [mode,name] of [['camp','01-survive'],['night','02-shelter'],['gather','03-gather'],['craft','04-craft'],['battle','05-battle'],['cooking','06-water'],['map','07-explore'],['journal','08-journal']]){
  const {page,context}=await makePage(mode);
  if(mode==='gather'){await page.locator('[data-action="gather"]').click();await finish(page);}
  if(mode==='craft'){await page.locator('.bottom-nav [data-tab="craft"]').click();await page.locator('[data-filter="craft"]').selectOption('tools');}
  if(mode==='cooking'){await page.locator('.bottom-nav [data-tab="craft"]').click();await page.locator('[data-filter="craft"]').selectOption('cooking');await page.locator('.recipe-detail[data-id="water"]').click();}
  if(mode==='map')await page.locator('.bottom-nav [data-tab="map"]').click();
  if(mode==='journal')await page.locator('.bottom-nav [data-tab="journal"]').click();
  await page.waitForTimeout(500);await shot(page,name);await context.close();console.log('Captured '+name);
 }
 for(const mode of ['night','gather','craft','battle','map','journal']){
  const {page,context,start}=await makePage(mode,true);
  if(mode==='craft'){await page.locator('.bottom-nav [data-tab="craft"]').click();await page.locator('[data-filter="craft"]').selectOption('cooking');await page.locator('.recipe-detail[data-id="water"]').click();}
  if(mode==='map')await page.locator('.bottom-nav [data-tab="map"]').click();
  if(mode==='journal')await page.locator('.bottom-nav [data-tab="journal"]').click();
  const offset=(Date.now()-start)/1000;await page.waitForTimeout(600);
  if(mode==='gather')await page.locator('[data-action="gather"]').click();
  if(mode==='craft')await page.locator('[data-ui="perform"][data-kind="craft"][data-id="water"]').click();
  if(mode==='battle'){await page.getByRole('button',{name:/^Attack /}).click();await finish(page);await page.waitForTimeout(500);await page.getByRole('button',{name:/^Guard /}).click();}
  if(mode==='map'){await page.locator('.map-node[data-id="river"]').click();}
  await page.waitForTimeout(5500);
  const video=page.video();await context.close();const path=await video.path();manifest.clips.push({mode,file:path.split(/[\\/]/).pop(),offset,duration:6});console.log('Recorded '+mode);
 }
}finally{await browser.close();await writeFile(new URL('captures/manifest.json',root),JSON.stringify(manifest,null,2));}
if(manifest.errors.length)throw new Error(manifest.errors.join('\n'));
