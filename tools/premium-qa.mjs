import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser} from './browser-runtime.mjs';
await mkdir('test-results',{recursive:true});
const browser=await launchBrowser(),errors=[],missing=[],checks=[];
const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1});
await page.addInitScript(()=>{if(window.name.startsWith('qa-fixture:')){localStorage.setItem('wildfall-onboarded','1');localStorage.setItem('wildfall-save-v1',window.name.slice(11));window.name='';}});
await page.addInitScript(()=>{crypto.getRandomValues=array=>{array.fill(7103);return array;};});
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wildfall-save-v1')).state);
const audio=()=>page.evaluate(async()=>(await import('/ui/audio.js')).audioDiagnostics());
const motion=()=>page.evaluate(async()=>(await import('/ui/motion.js')).motionDiagnostics());
async function settle(){await page.waitForFunction(()=>!document.body.classList.contains('action-busy'));await page.waitForTimeout(450);const ack=page.locator('[data-ui="acknowledge-result"]');if(await ack.count())await ack.click();}
async function encounters(){for(let i=0;i<20;i++){const s=await save();if(s.event)await page.locator('.event-options [data-kind="resolveEvent"]:not([disabled])').last().click();else if(s.combat)await page.getByRole('button',{name:/^Retreat /}).click();else if(s.carcass)await page.getByRole('button',{name:'Leave carcass',exact:true}).click();else return;await settle();}throw new Error('Encounter did not resolve');}
async function shot(name){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode().catch(()=>{})));});await page.screenshot({path:`test-results/premium-${name}.png`});}
async function nav(name){await page.locator('.bottom-nav').getByRole('button',{name,exact:true}).click();}
async function findRecipe(id){for(let i=0;i<10;i++){if(await page.locator(`[data-recipe="${id}"]`).count())return page.locator(`[data-recipe="${id}"]`);await page.locator('.page-controls [data-scope="craft"]').last().click();}throw new Error('Recipe missing '+id);}
async function fixture(mode){
  // Controlled UI fixtures only. Campaign playthroughs use public actions separately.
  await page.evaluate(async mode=>{
    const names=['items','recipes','locations','weather','enemies','events','scenarios','quests'];
    const content=Object.fromEntries(await Promise.all(names.map(async n=>[n,await (await fetch(`/data/${n}.json`)).json()])));
    const {GameEngine}=await import('/game/engine.js'),{beginCombat}=await import('/game/combat.js');
    const g=new GameEngine(content,null,{seed:2026,scenario:'last_ember'}),s=g.state;
    s.camp={shelter:1,firepit:true,fire:500,garden:false,rain_collector:false};s.items={wood:12,stone:8,fiber:8,scrap:2,ration:3,water:4,herbs:4,dirty_water:2,bandage:2};
    s.gear.push({id:'spear',uid:'spear-2',durability:content.items.spear.durability});s.nextGear=3;s.equipment.weapon='spear-2';
    if(mode==='battle'){s.location='forest';s.visited.push('forest');beginCombat(s,content,'bear');}
    if(mode==='river'){s.location='river';s.discovered.push('river');s.visited.push('forest','river');s.weather='rain';}
    if(mode==='pack'){
      s.items=Object.fromEntries(Object.entries(content.items).filter(([,i])=>i.category!=='gear').map(([id])=>[id,1]));
      s.gear=Object.entries(content.items).filter(([,i])=>i.category==='gear').map(([id,i],n)=>({id,uid:id+'-'+n,durability:i.durability}));s.nextGear=s.gear.length+1;
      s.equipment={tool:s.gear.find(g=>g.id==='iron_axe').uid,weapon:s.gear.find(g=>g.id==='bow').uid,clothing:s.gear.find(g=>g.id==='insulated').uid};
    }
    window.name='qa-fixture:'+JSON.stringify({state:s,checkpoint:structuredClone(s)});
  },mode);
  await page.reload();await page.getByRole('button',{name:/Continue/}).click();
}
try{
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button',{name:'New journey',exact:true}).waitFor();await shot('menu-phone');
  for(const width of [320,412,760,1440]){
    await page.setViewportSize({width,height:915});await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.menu-content h1').evaluate(h=>h.scrollWidth<=h.clientWidth+1),true,`Title fits ${width}px`);
  }
  await page.setViewportSize({width:412,height:915});checks.push('English menu and responsive title');
  await page.getByRole('button',{name:'New journey',exact:true}).click();
  assert.equal(await page.locator('.scenario-portrait').count(),3);
  await shot('new-journey-phone');await page.getByRole('button',{name:'Enter the valley',exact:true}).click();
  await page.getByRole('heading',{name:'The last flight.',exact:true}).waitFor();await shot('prologue-phone');await page.getByRole('button',{name:'Skip story',exact:true}).click();
  await page.getByRole('button',{name:'Got it',exact:true}).click();await shot('guided-onboarding-phone');await page.getByRole('button',{name:'Skip',exact:true}).click();
  await page.getByRole('heading',{name:'Last Camp',exact:true}).waitFor();await shot('camp-phone');
  await page.locator('[data-ui="action-dialog"][data-kind="sleep"]').click();
  assert.equal(await page.locator('.cost-preview span').count(),4);
  await page.getByRole('button',{name:'Close dialog'}).click();
  let before=await save();await page.locator('[data-action="gather"]').evaluate(button=>{button.click();button.click();});
  await page.locator('.action-theatre[data-kind="gather"]').waitFor();
  assert.equal((await save()).time-before.time,45,'Save is committed before animation completes');
  await shot('gather-phone');
  await settle();let after=await save();assert.equal(after.time-before.time,45);
  assert.equal((await motion()).kind,'gather');assert.ok(after.items.wood>before.items.wood);
  checks.push('gather animation, actual loot, cost preview and duplicate input lock');
  for(const name of ['Explore','Pack','Craft','Journal','Camp']){await nav(name);await shot(`${name.toLowerCase()}-phone`);}
  await nav('Pack');await page.getByRole('combobox',{name:'Inventory category'}).selectOption('food');before=await save();await page.getByRole('button',{name:'Eat Emergency ration',exact:true}).click();
  await page.locator('.fx-eat').waitFor();await settle();after=await save();assert.equal(after.items.ration,before.items.ration-1);assert.equal((await motion()).options.id,'ration');
  before=after;await page.getByRole('button',{name:'Drink Clean water',exact:true}).click();await page.locator('.fx-drink').waitFor();await settle();assert.equal((await save()).items.water,before.items.water-1);
  checks.push('eating and drinking motion and consumed inventory');
  await nav('Explore');await page.locator('.map-node[data-id="forest"]').click();
  await page.getByRole('button',{name:'Travel',exact:true}).click();await page.getByRole('button',{name:'Travel',exact:true}).click();
  await page.locator('.fx-travel').waitFor();await settle();assert.equal((await save()).location,'forest');await encounters();await page.getByRole('heading',{name:'Ashpine Forest',exact:true}).waitFor();
  before=await save();await page.reload();await page.getByRole('button',{name:/Continue/}).click();assert.deepEqual(await save(),before);checks.push('travel and exact save restoration');
  await page.waitForFunction(async()=>{const d=(await import('/ui/audio.js')).audioDiagnostics();return d.loaded.length===16&&d.state==='running';});
  await page.waitForFunction(async()=>(await import('/ui/audio.js')).audioDiagnostics().activeLayers.includes('wind'),{},{timeout:5000});
  await page.locator('.mobile-settings').click();await shot('settings-phone');
  await page.getByRole('button',{name:/Sound effects Natural/}).click();assert.equal((await audio()).settings.sound,false);
  await page.getByRole('button',{name:/Nature ambience Wind/}).click();assert.equal((await audio()).settings.ambient,false);
  await page.getByRole('button',{name:/Sound effects Natural/}).click();await page.getByRole('button',{name:/Nature ambience Wind/}).click();
  await page.getByRole('slider',{name:'Effects volume'}).evaluate(input=>{input.value='40';input.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await audio()).settings.sfxVolume,.4);
  await page.getByRole('button',{name:/Larger text A little/}).click();assert.equal(await page.locator('html').evaluate(h=>h.classList.contains('large-text')),true);
  await page.getByRole('button',{name:/Larger text A little/}).click();await page.getByRole('button',{name:'About WILDFALL',exact:true}).click();await page.getByText('No music or instrument sounds.',{exact:false}).waitFor({state:'attached'});await page.getByRole('button',{name:'Close dialog'}).click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(async()=>(await import('/ui/audio.js')).audioDiagnostics().state==='suspended');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(async()=>(await import('/ui/audio.js')).audioDiagnostics().state==='running');
  checks.push('16 decoded foley clips, separate toggles and volumes, background suspend/resume');
  await fixture('river');await page.waitForTimeout(700);assert.ok((await audio()).activeLayers.includes('river'));assert.ok((await audio()).activeLayers.includes('rain'));await shot('river-phone');
  await fixture('camp');await page.waitForTimeout(700);assert.ok((await audio()).activeLayers.includes('fire'));
  await nav('Craft');await (await findRecipe('rain_collector')).getByRole('button',{name:'Build',exact:true}).click();
  await page.locator('.fx-craft').waitFor();await shot('craft-action-phone');await settle();assert.equal((await save()).camp.rain_collector,true);checks.push('craft reveal and camp build state');
  await fixture('battle');await page.getByRole('heading',{name:'Valley Grizzly',exact:true}).waitFor();await shot('battle-phone');
  before=await save();await page.getByRole('button',{name:/^Attack /}).click();
  await page.locator('.hit-number.dealt').waitFor();await shot('battle-impact-phone');await settle();after=await save();let fx=await motion();
  assert.equal(fx.effects.battle.damageDealt,before.combat.health-after.combat.health);assert.ok(fx.effects.battle.damageTaken>0);assert.equal(fx.effects.stats.health,after.stats.health-before.stats.health);
  await page.getByRole('button',{name:/^Guard /}).click();await page.locator('.guard-aura').waitFor();await settle();assert.equal((await motion()).options.move,'defend');
  while((await save()).combat){await page.getByRole('button',{name:/^Power strike /}).click();await settle();}
  assert.equal((await motion()).effects.battle.victory,true);assert.equal((await save()).counters.battlesWon,1);checks.push('battle lunge, actual hit numbers, guard and defeat');
  await fixture('pack');await nav('Pack');await page.getByRole('combobox',{name:'Inventory category'}).selectOption('all');const itemIds=new Set();
  for(let i=0;i<16;i++){for(const id of await page.locator('.item-card').evaluateAll(cards=>cards.map(c=>c.dataset.item)))itemIds.add(id);const next=page.locator('.page-controls [data-scope="pack"]').last();if(await next.isDisabled())break;await next.click();}assert.equal(itemIds.size,await page.evaluate(async()=>Object.keys(await(await fetch('/data/items.json')).json()).length));
  await page.getByRole('combobox',{name:'Inventory category'}).selectOption('gear');await shot('all-items-phone');
  await nav('Camp');await page.setViewportSize({width:1440,height:1000});await shot('camp-desktop');
  for(const width of [320,412,1440]){
    await page.setViewportSize({width,height:width===320?640:915});
    for(const tab of ['camp','map','pack','craft','journal']){
      await page.locator(`${width>760?'.sidebar nav':'.bottom-nav'} [data-tab="${tab}"]`).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${tab} fits ${width}px`);
      if(width<=412){const d=await page.evaluate(()=>({bottom:document.querySelector('#main-view').getBoundingClientRect().bottom,nav:document.querySelector('.bottom-nav').getBoundingClientRect().top}));assert.ok(d.bottom-d.nav<=55,`${tab} uses a compact viewport at ${width}px: ${d.bottom-d.nav}px`);}
    }
  }
  await page.setViewportSize({width:320,height:640});await page.locator('.mobile-settings').click();await page.getByRole('button',{name:/Larger text A little/}).click();await page.getByRole('button',{name:'Close dialog'}).click();
  for(const name of ['Camp','Explore','Pack','Craft','Journal']){await nav(name);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name} fits larger text at 320px`);}
  checks.push(`all ${itemIds.size} item cards and five tabs at 320/412/1440px, including larger text`);
  await page.setViewportSize({width:412,height:915});await nav('Camp');await page.locator('.mobile-settings').click();await page.getByRole('button',{name:/Animation Atmosphere/}).click();await page.getByRole('button',{name:'Close dialog'}).click();
  assert.equal(await page.locator('html').evaluate(h=>h.classList.contains('no-motion')),true);
  await page.locator('[data-action="gather"]').click();await settle();assert.equal(await page.locator('.action-theatre').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.mobile-settings').click();await page.getByRole('button',{name:/Animation Atmosphere/}).click();await page.getByRole('button',{name:'Close dialog'}).click();assert.equal(await page.locator('html').evaluate(h=>h.classList.contains('no-motion')),true);
  checks.push('animation setting and OS reduced motion');
  assert.deepEqual(errors,[],'No JavaScript errors');assert.deepEqual(missing,[],'All assets resolve');
  await writeFile('test-results/browser-report.json',JSON.stringify({passed:true,widths:[320,412,760,1440],checks,audio:await audio(),errors,missing},null,2));
  console.log(`Browser QA passed: ${checks.length} groups, responsive UI, actual action/battle motion, audio controls, persistence; no errors or missing assets.`);
}finally{await browser.close();}
