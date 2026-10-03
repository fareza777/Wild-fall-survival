import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchBrowser} from './browser-runtime.mjs';
await mkdir('test-results',{recursive:true});
const browser=await launchBrowser(),errors=[],missing=[],checks=[];
const difficulty=process.argv[2]||'story';
const page=await browser.newPage({viewport:{width:412,height:915},deviceScaleFactor:1});
await page.addInitScript(()=>{crypto.getRandomValues=a=>{a.fill(7103);return a;};if(window.name.startsWith('qa-fixture:')){localStorage.setItem('wildfall-save-v1',window.name.slice(11));window.name='';}});
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wildfall-save-v1')).state);
const finished=async()=>{await page.waitForFunction(()=>!document.body.classList.contains('action-busy'),{},{timeout:15000});};
async function shot(name){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.loading!=='lazy').map(i=>i.decode().catch(()=>{})));});await page.screenshot({path:`test-results/refined-${name}.png`});}
async function ack(){await page.locator('[data-ui="acknowledge-result"]').click();}
async function fixture(kind){
 await page.evaluate(async kind=>{
  const names=['items','recipes','locations','weather','enemies','events','scenarios','quests','story'],c=Object.fromEntries(await Promise.all(names.map(async n=>[n,await(await fetch(`/data/${n}.json`)).json()])));
  const {GameEngine}=await import('/game/engine.js'),{beginCombat}=await import('/game/combat.js');const g=new GameEngine(c,null,{seed:78043});const s=g.state;s.nextWeather=1e8;
  if(kind==='rain'){s.weather='rain';s.camp.shelter=3;s.camp.firepit=true;s.camp.fire=500;s.items={wood:10,fiber:10,stone:2,dirty_water:2};}
  else {s.location='forest';s.visited.push('forest');s.items=kind==='full'?{stone:34}:kind==='tired'?{water:2,ration:2,bandage:2}:{};if(kind==='tired')s.stats.stamina=6;beginCombat(s,c,'wolf');s.combat.health=1;}
  window.name='qa-fixture:'+JSON.stringify({state:s,checkpoint:structuredClone(s)});
 },kind);
 await page.reload();await page.locator('[data-ui="continue"]').click();
}
try{
 await page.goto('http://127.0.0.1:4173');await page.getByRole('button',{name:'New journey',exact:true}).click();if(difficulty==='story')await page.getByRole('button',{name:'Explorer',exact:true}).click();await page.getByRole('button',{name:'Enter the valley',exact:true}).click();
 const titles=['The last flight.','Into the white.','No way back.','What remains.','One signal.'];
 for(let i=0;i<5;i++){
  await page.getByRole('heading',{name:titles[i],exact:true}).waitFor();assert.equal((await save()).time,480);await shot(`story-${i+1}`);
  for(const width of [320,412]){await page.setViewportSize({width,height:width===320?640:915});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await page.locator('.story-controls').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),true);}
  await page.setViewportSize({width:412,height:915});await page.getByRole('button',{name:i===4?'Make camp':'Continue',exact:true}).click();
 }
 checks.push('five generated story scenes; clock frozen, phone layout, English story');
 await page.getByRole('button',{name:'Got it',exact:true}).click();await shot('guided-gather');
 const before=await save(),start=Date.now();await page.locator('button[data-action="gather"]').click();await page.locator('.action-theatre').waitFor();await page.waitForTimeout(900);assert.equal(await page.locator('.action-theatre').count(),1,'Gather is not a fleeting reveal');
 await finished();await page.locator('[data-ui="acknowledge-result"]').waitFor();assert.ok(Date.now()-start>=1900);const held=await save();assert.equal(held.time-before.time,45);assert.ok(held.receipt);await page.waitForTimeout(3500);assert.equal(await page.locator('[data-ui="acknowledge-result"]').count(),1);await shot('gather-results');
 await page.locator('[data-ui="modal-backdrop"]').click({position:{x:4,y:4}});assert.equal(await page.locator('[data-ui="acknowledge-result"]').count(),1);
 await page.reload();await page.locator('[data-ui="continue"]').click();assert.deepEqual(await save(),held);await page.locator('[data-ui="acknowledge-result"]').waitFor();await ack();assert.equal((await save()).time,held.time);assert.equal((await save()).seed,held.seed);checks.push('2.2-second gather; result held for manual Continue, backdrop cannot dismiss, exact reload restoration');
 // Follow only the controls that the real tutorial highlights. No injected resources.
 let tutorialActions=1;
 for(let i=0;i<110&&(await save()).tutorial.active;i++){
  await writeFile('test-results/refinements-progress.json',JSON.stringify({iteration:i,state:await save(),type:await page.locator('#modal-root').getAttribute('data-type')},null,2));
  const s=await save();if(s.dead)throw new Error('Guided survivor died: '+JSON.stringify(s.stats));
  const ackButton=page.locator('[data-ui="acknowledge-result"]');if(await ackButton.count()){await ack();continue;}
  assert.equal(s.event,null,'No random interruption during onboarding');assert.equal(s.combat,null,'No tutorial ambush');
  if(s.tutorial.step===8&&await page.getByRole('button',{name:'Ready',exact:true}).count()){assert.ok(s.stats.stamina>=40);await shot('guided-rescue');await page.getByRole('button',{name:'Ready',exact:true}).click();break;}
  const target=page.locator('.guide-target');assert.equal(await target.count(),1,'Every guided stage has a visible control: '+JSON.stringify({step:s.tutorial.step,stats:s.stats,items:s.items}));
  const wasAction=await target.evaluate(el=>!!el.dataset.action||el.dataset.ui==='perform');await target.click();if(wasAction){tutorialActions++;await finished();}
 }
 assert.equal((await save()).tutorial.active,false,'Tutorial can be completed through public UI actions');assert.ok((await save()).camp.shelter&& (await save()).camp.fire_cover);checks.push(`guided camp, safe supplies, forest search and rescue journal completed using ${tutorialActions} public actions`);
 await fixture('rain');assert.equal((await save()).camp.fire,0);assert.equal(await page.locator('.fire-glow').count(),0);await shot('rain-fire-out');
 await page.locator('[data-ui="fire-dialog"]').click();await page.getByText('Rain puts out exposed fires. Build a fire canopy first.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Add fuel',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Build fire canopy',exact:true}).click();await page.getByRole('button',{name:'Build',exact:true}).click();await finished();await ack();await page.locator('[data-ui="fire-dialog"]').click();await page.getByRole('button',{name:'Add fuel',exact:true}).click();await finished();assert.ok((await save()).camp.fire>0);await ack();assert.equal(await page.locator('.scene-fire-cover').count(),1);await shot('rain-covered-fire');checks.push('rain kills exposed fire under a lodge; canopy builds, lights and renders a covered fire');
 await fixture('wolf');await page.getByRole('button',{name:/^Attack /}).click();await finished();assert.equal((await save()).items.raw_meat||0,0);await page.getByRole('heading',{name:'Ash Wolf defeated.',exact:true}).waitFor();await shot('wolf-victory');const corpse=(await save()).carcass;await page.waitForTimeout(2200);assert.equal(await page.locator('[data-ui="acknowledge-result"]').count(),1);await ack();await page.getByRole('button',{name:/^Skin only /}).click();await finished();assert.equal((await save()).items.hide,corpse.loot.hide);assert.equal((await save()).carcass.loot.hide,undefined);await shot('wolf-hide');await ack();assert.equal(await page.getByRole('button',{name:/^Skin only /}).count(),0);await page.getByRole('button',{name:/^Take meat /}).click();await finished();assert.equal((await save()).items.raw_meat,corpse.loot.raw_meat);assert.equal((await save()).carcass,null);await ack();checks.push('wolf battle victory held; separate skin and meat harvesting with no duplicate loot');
 await fixture('full');await page.getByRole('button',{name:/^Attack /}).click();await finished();await ack();await page.getByRole('button',{name:/^Skin & butcher /}).click();await finished();assert.ok(Object.keys((await save()).receipt.effects.left).length);assert.equal((await save()).items.raw_meat||0,0);await shot('full-pack-results');
 for(const width of [320,412]){await page.setViewportSize({width,height:width===320?640:915});const modal=page.locator('.result-modal');assert.equal(await modal.evaluate(el=>el.scrollHeight<=el.clientHeight+1),true,'Results fit without scrolling at '+width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 checks.push('capacity-limited wolf harvest reports left items; default result screens fit 320×640 and 412×915');
 await page.setViewportSize({width:320,height:640});await fixture('tired');await page.getByRole('button',{name:/^Attack /}).click();await finished();await ack();assert.equal((await save()).stats.stamina,0);assert.equal(await page.locator('.result-modal').evaluate(el=>el.scrollHeight<=el.clientHeight+1),true,'Exhausted harvest sheet fits a small phone');await shot('exhausted-wolf');await page.getByRole('button',{name:'Rest nearby · 1h',exact:true}).click();await finished();await ack();await page.getByRole('button',{name:/^Skin & butcher /}).click();await finished();assert.equal((await save()).carcass,null);checks.push('exhausted winner can rest, use supplies, and harvest; carcass timer advances and recovery sheet fits 320×640');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await writeFile(`test-results/refinements-${difficulty}-report.json`,JSON.stringify({passed:true,difficulty,checks,tutorialActions,errors,missing},null,2));console.log(JSON.stringify({passed:true,difficulty,checks,tutorialActions},null,2));
}catch(error){await shot('failure');await writeFile('test-results/refinements-failure.json',JSON.stringify({error:error.message,save:await save().catch(()=>null),errors,missing},null,2));throw error;}finally{await browser.close();}
