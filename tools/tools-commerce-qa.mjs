import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {launchBrowser} from './browser-runtime.mjs';
const version=JSON.parse(await readFile('package.json','utf8')).version;
await mkdir('test-results',{recursive:true});
const browser=await launchBrowser(),page=await browser.newPage({viewport:{width:412,height:840},isMobile:true,hasTouch:true});
const errors=[],missing=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
await page.addInitScript(()=>{localStorage.setItem('wildfall-onboarded','1');localStorage.setItem('wildfall-preferences-v1',JSON.stringify({sound:false,ambient:false,narration:false,motion:false}));if(window.name.startsWith('tools-fixture:')){localStorage.setItem('wildfall-save-v1',window.name.slice(14));window.name='';}});
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wildfall-save-v1')).state);
const finished=()=>page.waitForFunction(()=>!document.body.classList.contains('action-busy'),{},{timeout:15000});
const ack=()=>page.locator('[data-ui="acknowledge-result"]').click();
const close=()=>page.locator('[data-ui="close-modal"]').click();
async function fixture(kind){
 await page.evaluate(async kind=>{
  const names=['items','recipes','locations','weather','enemies','events','scenarios','quests','story'],c=Object.fromEntries(await Promise.all(names.map(async n=>[n,await(await fetch(`/data/${n}.json`)).json()]))),{GameEngine}=await import('/game/engine.js');
  const g=new GameEngine(c,null,{seed:7103}),s=g.state;
  s.prologue={step:4,complete:true};s.tutorial={step:8,active:false,usedFood:true,usedWater:true,version:2};s.nextWeather=1e8;
  Object.assign(s.camp,{firepit:true,fire_cover:true,fire:600});
  s.items={scrap:3,fiber:5,wood:4,dirty_water:4,raw_meat:2};
  if(kind==='missing-pot')s.gear=s.gear.filter(x=>x.id!=='cooking_pot');
  if(kind==='legacy'){delete s.toolsVersion;s.gear=s.gear.filter(x=>x.id==='knife');}
  window.name='tools-fixture:'+JSON.stringify({state:s,checkpoint:structuredClone(s)});
 },kind);
 await page.reload();await page.locator('[data-ui="continue"]').click();
}
async function recipe(id){
 await page.locator('.bottom-nav [data-tab="craft"]').click();
 await page.locator('[data-filter="craft"]').selectOption('cooking');
 await page.locator(`.recipe-detail[data-id="${id}"]`).click();
}
async function fits(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
try{
 await page.goto('http://127.0.0.1:4173');
 await page.locator('[data-ui="store"]').click();
 await page.getByRole('heading',{name:'A quieter wilderness.',exact:true}).waitFor();
 assert.equal(await page.locator('[data-ui="purchase-remove-ads"]').isDisabled(),true);
 assert.match(await page.locator('.commerce-card').innerText(),/US\$4\.99/);
 for(const viewport of [{width:320,height:640},{width:412,height:840}]){await page.setViewportSize(viewport);await fits();await page.screenshot({path:`test-results/commerce-${viewport.width}.png`});}
 checks.push('Remove Ads shows US$4.99, honest unavailable browser purchase, readable at 320px and banner-reduced 412px');
 await close();await fixture('missing-pot');await recipe('water');
 await page.locator('.tool-needs .missing').waitFor();assert.equal(await page.locator('[data-ui="perform"][data-kind="craft"][data-id="water"]').isDisabled(),true);
 await page.locator('.tool-needs [data-ui="craft-dialog"][data-id="cooking_pot"]').click();
 await page.locator('[data-ui="perform"][data-kind="craft"][data-id="cooking_pot"]').click();await finished();
 assert.ok((await state()).gear.some(x=>x.id==='cooking_pot'));await ack();
 await recipe('water');await page.locator('.tool-needs .ready').waitFor();
 await page.locator('[data-ui="perform"][data-kind="craft"][data-id="water"]').click();await finished();
 const boiled=await state();assert.equal(boiled.counters.waterBoiled,2);assert.equal(boiled.items.water,2);assert.equal(boiled.gear.find(x=>x.id==='cooking_pot').durability,88);
 await page.waitForTimeout(900);assert.equal(await page.locator('[data-ui="acknowledge-result"]').count(),1);await page.screenshot({path:'test-results/tools-boiled-water.png'});await ack();
 checks.push('missing pot blocks cooking; real Craft shortcut creates one reusable pot; boiling consumes dirty water and wears the pot; results remain until Continue');
 await recipe('cooked_meat');await page.locator('.tool-needs .missing').waitFor();
 await page.locator('.tool-needs [data-ui="craft-dialog"][data-id="roasting_spit"]').click();
 await page.locator('[data-ui="perform"][data-kind="craft"][data-id="roasting_spit"]').click();await finished();await ack();
 await recipe('cooked_meat');await page.locator('[data-ui="perform"][data-kind="craft"][data-id="cooked_meat"]').click();await finished();assert.equal((await state()).items.cooked_meat,1);await ack();
 checks.push('roasting spit is crafted and reused for actual meat cooking');
 await page.locator('.bottom-nav [data-tab="pack"]').click();await page.locator('[data-filter="pack"]').selectOption('gear');
 await page.locator('[data-item="cooking_pot"] .item-info').click();assert.equal(await page.getByRole('button',{name:'Equip',exact:true}).count(),0);
 await page.getByRole('button',{name:'Repair',exact:true}).click();await finished();assert.equal((await state()).gear.find(x=>x.id==='cooking_pot').durability,90);await ack();
 checks.push('carried cooking kit uses no equipment slot and repairs with the displayed scrap cost');
 await page.evaluate(()=>wildfallBack());await page.locator('[data-ui="store"]').click();
 for(const viewport of [{width:320,height:640},{width:412,height:840}]){await page.setViewportSize(viewport);await fits();assert.equal(await page.locator('.modal').evaluate(el=>el.scrollHeight<=el.clientHeight+1),true,'Supply pack fits without scrolling');await page.screenshot({path:`test-results/commerce-supplies-${viewport.width}.png`});}
 assert.equal(await page.locator('[data-ui="load-reward"]').isDisabled(),true);
 await page.locator('[data-ui="commerce-panel"][data-panel="ads"]').click();assert.equal(await page.locator('[data-ui="purchase-remove-ads"]').isDisabled(),true);
 await close();
 checks.push('pause opens Remove Ads and optional ration/water supply card; browser does not fake rewarded SDK ads');
 await fixture('legacy');const migrated=await state();assert.deepEqual(migrated.gear.map(x=>x.id),['knife','cooking_pot','canteen','fire_drill']);assert.equal(migrated.time,480);
 await page.reload();await page.locator('[data-ui="continue"]').click();assert.equal((await state()).gear.length,4);
 checks.push('old saves receive formerly implicit starter tools exactly once without changing the clock');
 const images=await page.evaluate(async()=>{const ids=['cooking_pot','canteen','fire_drill','roasting_spit','pickaxe','hammer','sewing_kit'];return Promise.all(ids.map(async id=>{const img=new Image();img.src=`/assets/art/items/${id}.webp`;await img.decode();return {id,width:img.naturalWidth,height:img.naturalHeight};}));});
 for(const img of images)assert.ok(img.width>100&&img.height>100);checks.push('all seven generated tool illustrations decode successfully');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await writeFile('test-results/tools-commerce-report.json',JSON.stringify({passed:true,version,checks,images,errors,missing},null,2));console.log(JSON.stringify({passed:true,checks},null,2));
}catch(error){await page.screenshot({path:'test-results/tools-commerce-failure.png'});throw error;}finally{await browser.close();}
