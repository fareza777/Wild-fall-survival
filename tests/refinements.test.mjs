import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameEngine,createState} from '../web/game/engine.js';
import {parseSave,validState} from '../web/game/storage.js';
import {advanceTime} from '../web/game/survival.js';
import {guideStep,progressGuide} from '../web/ui/guide.js';
const c=Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests','story'].map(async n=>[n,JSON.parse(await readFile(`web/data/${n}.json`,'utf8'))])));
const game=seed=>new GameEngine(c,null,{seed:seed||2026});
function win(g){g.state.combat={id:'wolf',health:1,maxHealth:38,turn:1,messages:[]};return g.perform('combat',{move:'attack'});}

test('rain extinguishes outdoor fires immediately, even under a sleeping shelter or while away',()=>{
 for(const location of ['camp','forest'])for(const shelter of [0,1,3]){const g=game();Object.assign(g.state,{weather:'rain',location});Object.assign(g.state.camp,{shelter,fire:600});advanceTime(g.state,c,1,0);assert.equal(g.state.camp.fire,0);}
});
test('rain cannot consume ignition materials; a dedicated canopy permits fire and cooking',()=>{
 const g=game();g.state.camp.firepit=true;g.state.weather='rain';const before=JSON.stringify(g.state);assert.equal(g.perform('fire').ok,false);assert.equal(JSON.stringify(g.state),before);
 g.state.camp.fire_cover=true;assert.ok(g.perform('fire').ok);assert.equal(g.state.camp.fire,345);g.state.items.dirty_water=2;assert.ok(g.perform('craft',{id:'water'}).ok);assert.equal(g.state.counters.waterBoiled,2);
});
test('weather starts inside a long action; exposed fire stops warming for the remaining hours',()=>{
 const g=game(78043);g.state.nextWeather=g.state.time+30;g.state.camp.fire=500;
 // Restrict the weather table to rain to make the boundary, not chance, the subject.
 const rainOnly={...c,weather:{clear:c.weather.clear,rain:c.weather.rain}};
 const h=new GameEngine(rainOnly,g.state);h.state.seed=2026;
 // Find a seed whose next weather is rain without altering simulation rules.
 for(let seed=10000;seed<50000;seed++){const probe=new GameEngine(rainOnly,g.state);probe.state.seed=seed;const r=probe.perform('sleep',{hours:2});if(probe.state.weather==='rain'){assert.equal(probe.state.camp.fire,0);assert.equal(r.notes.some(n=>n.includes('extinguished')),true);return;}}
 assert.fail('Expected at least one rainy weather seed');
});
test('rain interrupts cooking without creating cooked food or losing raw ingredients',()=>{
 const wet={...c,weather:{rain:c.weather.rain}},g=new GameEngine(wet,null,{seed:2026});g.state.weather='clear';g.content={...wet,weather:{clear:c.weather.clear,rain:c.weather.rain}};
 g.state.items.raw_meat=2;g.state.camp.fire=300;g.state.nextWeather=g.state.time+1;
 g.state.gear.push({id:'roasting_spit',uid:'rain-spit',durability:c.items.roasting_spit.durability});
 for(let seed=10000;seed<50000;seed++){const h=new GameEngine(g.content,g.state);h.state.seed=seed;const r=h.perform('craft',{id:'cooked_meat'});if(h.state.weather==='rain'){assert.equal(h.state.items.raw_meat,2);assert.equal(h.state.items.cooked_meat||0,0);assert.equal(h.state.counters.mealsCooked,0);assert.ok(r.message.includes('Uncooked'));assert.ok(h.state.time>g.state.time);return;}}
 assert.fail('Expected rain');
});
test('seeded gather outcomes include sparse and rich finds, different counts, and honest capacity receipts',()=>{
 const g=game(),outcomes=new Set(),qualities=new Set();g.state.nextWeather=1e8;
 for(let i=0;i<90;i++){Object.assign(g.state.stats,{stamina:100,calories:2800,hydration:2500,health:100,fatigue:0,injury:0,sickness:0,temperature:36.8});g.state.event=null;g.state.items={};const r=g.perform('gather');assert.ok(r.ok);outcomes.add(JSON.stringify(r.effects.gained));qualities.add(r.quality);assert.ok(validState(g.state,c));}
 assert.ok(outcomes.size>15);assert.deepEqual([...qualities].sort(),['Rich','Sparse','Steady']);
 g.state.stats.stamina=100;g.state.event=null;g.state.items={stone:50};const r=g.perform('gather');assert.equal(Object.keys(r.effects.gained).length,0);assert.ok(Object.keys(r.effects.left).length>0);assert.deepEqual(g.state.receipt.effects,r.effects);
});
test('wolf victory leaves a persistent carcass; choosing meat and hide charges once per part',()=>{
 const g=game();const victory=win(g);assert.ok(victory.effects.battle.victory);assert.equal(g.state.items.raw_meat||0,0);assert.equal(g.state.items.hide||0,0);assert.equal(g.state.carcass.id,'wolf');
 const yields={...g.state.carcass.loot},save=parseSave(JSON.stringify({state:g.state}),c);assert.ok(save);const h=new GameEngine(c,save.state);h.state.receipt=null;
 assert.equal(h.perform('gather').ok,false);assert.ok(h.perform('harvestCarcass',{part:'hide'}).ok);assert.equal(h.state.items.hide,yields.hide);assert.equal(h.state.carcass.loot.hide,undefined);assert.equal(h.perform('harvestCarcass',{part:'hide'}).ok,false);
 assert.ok(h.perform('harvestCarcass',{part:'meat'}).ok);assert.equal(h.state.items.raw_meat,yields.raw_meat);assert.equal(h.state.carcass,null);assert.equal(h.perform('harvestCarcass',{part:'all'}).ok,false);assert.ok(h.state.gear[0].durability<78);
});
test('butchering requires a blade and enough time; leaving a carcass always works without energy',()=>{
 const g=game();win(g);g.state.gear[0].durability=0;g.state.equipment.tool=null;const before=JSON.stringify(g.state);assert.equal(g.perform('harvestCarcass',{part:'all'}).ok,false);assert.equal(JSON.stringify(g.state),before);
 g.state.stats.stamina=0;assert.ok(g.perform('leaveCarcass').ok);assert.equal(g.state.carcass,null);
 const h=game();win(h);h.state.time=h.state.carcass.expires-1;assert.equal(h.perform('harvestCarcass',{part:'all'}).ok,false);assert.ok(h.perform('leaveCarcass').ok);
});
test('unread action results survive reload without rerolling items or charging time',()=>{
 const g=game();g.perform('gather');const before=structuredClone(g.state),save=parseSave(JSON.stringify({state:g.state}),c);assert.ok(save);const h=new GameEngine(c,save.state);assert.deepEqual(h.state,before);h.state.receipt=null;assert.deepEqual(h.state.items,before.items);assert.equal(h.state.time,before.time);assert.equal(h.state.seed,before.seed);
});
test('v1.1 saves migrate without forcing the prologue or tutorial on existing survivors',()=>{
 const s=createState(c);delete s.camp.fire_cover;for(const key of ['receipt','carcass','prologue','tutorial'])delete s[key];const save=parseSave(JSON.stringify({state:s}),c);assert.ok(save);const h=new GameEngine(c,save.state);assert.equal(h.state.camp.fire_cover,false);assert.equal(h.state.tutorial,null);assert.ok(validState(h.state,c));
});
test('guided steps point at real actions and advance only after the required gameplay',()=>{
 const g=game();g.state.tutorial={step:1,active:true};assert.ok(guideStep(g,'camp',null).selector.includes('gather'));progressGuide(g.state,'forage');assert.equal(g.state.tutorial.step,1);progressGuide(g.state,'gather');assert.equal(g.state.tutorial.step,2);g.state.camp.shelter=1;progressGuide(g.state,'craft',{id:'shelter'});assert.equal(g.state.tutorial.step,3);
 g.state.tutorial.step=6;progressGuide(g.state,'use',{id:'water'});assert.equal(g.state.tutorial.step,6);progressGuide(g.state,'use',{id:'ration'});assert.equal(g.state.tutorial.step,7);g.state.location='forest';progressGuide(g.state,'explore');assert.equal(g.state.tutorial.step,8);
});
test('story has five authored generated scenes and a late-rain variant matching Cold Trail',()=>{
 assert.equal(c.story.length,5);assert.equal(new Set(c.story.map(s=>s.art)).size,5);assert.ok(c.story[3].variants.cold_trail.includes('dusk'));assert.equal(c.scenarios.cold_trail.startHour,16);
});
test('weather during a radio transmission cannot grant rescue or the final quest',()=>{
 const weather={clear:c.weather.clear,rain:c.weather.rain};let found=false;
 for(let seed=10000;seed<50000&&!found;seed++){
  const g=new GameEngine({...c,weather},null,{seed});g.state.location='summit';g.state.items.radio=1;g.state.nextWeather=g.state.time+1;
  const r=g.perform('signal');if(g.state.weather==='rain'){found=true;assert.equal(g.state.flags.rescued,undefined);assert.equal(r.interrupted,true);assert.equal(g.state.quests.completed.includes('last_signal'),false);assert.equal(r.effects.minutes,30);}
 }
 assert.ok(found);
});
test('multi-leg travel previews include exertion after the weather changes without advancing the real seed',()=>{
 const g=game();g.state.discovered.push('river','cabin');g.state.nextWeather=g.state.time+1;
 const before=structuredClone(g.state),p=g.preview('travel',{id:'cabin'});assert.deepEqual(g.state,before);assert.equal(g.effort('travel',{id:'cabin'}),p.stamina);const r=g.perform('travel',{id:'cabin'});assert.ok(r.ok);assert.equal(g.state.stats.stamina,p.stats.stamina);assert.equal(g.state.stats.hydration,p.stats.hydration);
});
test('guided travel points to rest rather than a disabled travel button',()=>{
 const g=game();g.state.tutorial={step:7,active:true};g.state.stats.stamina=0;assert.equal(guideStep(g,'map','travel-dialog').selector,'button[data-ui="close-modal"]');assert.ok(guideStep(g,'camp',null).selector.includes('rest'));
});
test('an exhausted victor can use supplies and rest before harvesting; the carcass still ages',()=>{
 const g=game();g.state.location='forest';win(g);g.state.stats.stamina=0;const time=g.state.time;assert.ok(g.reason('harvestCarcass',{part:'all'}));assert.ok(g.perform('rest').ok);assert.equal(g.state.time,time+60);assert.equal(g.state.carcass.expires-g.state.time,120);assert.ok(g.perform('harvestCarcass',{part:'all'}).ok);assert.equal(g.state.carcass,null);
});
test('rain collector dawn yield uses the dawn weather even if skies clear later during sleep',()=>{
 const g=game();Object.assign(g.state,{time:300,startTime:300,weather:'rain',nextWeather:420});g.state.camp.rain_collector=true;const water=g.state.items.water;g.perform('sleep',{hours:3});assert.equal(g.state.weather,'clear');assert.equal(g.state.items.water,water+2);
});
test('constructing a garden across dawn does not grant produce before it existed',()=>{
 const g=new GameEngine({...c,quests:{main:[],side:[]}},null,{seed:2026});const recipe=c.recipes.garden;g.state.time=360-recipe.minutes/2;g.state.startTime=g.state.time;g.state.nextWeather=10000;g.state.items={...recipe.cost};g.state.flags.journal=true;
 assert.ok(g.perform('craft',{id:'garden'}).ok);assert.equal(g.state.camp.garden,true);assert.equal(g.state.items.berries||0,0);assert.equal(g.state.items.herbs||0,0);
});
