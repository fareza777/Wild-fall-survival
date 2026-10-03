import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameEngine} from '../web/game/engine.js';
import {guideStep,reconcileGuide} from '../web/ui/guide.js';
import {beginCombat} from '../web/game/combat.js';
const content=Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests','story'].map(async n=>[n,JSON.parse(await readFile(`web/data/${n}.json`,'utf8'))])));
function journey(seed=1){
 const g=new GameEngine(content,null,{seed});
 g.state.tutorial={step:7,active:true,version:2,usedWater:true,usedFood:true};
 g.state.nextWeather=1e8;g.state.counters.actions=4;
 return g;
}
test('the guided forest trip cannot ambush a low-stamina beginner',()=>{
 const g=journey();g.state.stats.stamina=7;
 assert.ok(g.perform('travel',{id:'forest'}).ok);
 assert.equal(g.state.combat,null);assert.equal(g.state.event,null);
 assert.equal(g.state.stats.stamina,2);assert.equal(g.state.time,505);
 assert.equal(g.state.counters.battlesWon,0);
});
test('guided searches stay uninterrupted across seeds; completed and skipped guides restore wildlife',()=>{
 for(const seed of [1,2,53,112,992,2026,7103,8731,2147483647]){
  const g=journey(seed);assert.ok(g.perform('travel',{id:'forest'}).ok);assert.ok(g.perform('explore').ok);
  assert.equal(g.state.combat,null,`Tutorial ambush: ${seed}`);assert.equal(g.state.event,null,`Tutorial interruption: ${seed}`);
 }
 for(const step of [0,8]){
  const g=journey();g.state.tutorial={step,active:false};g.perform('travel',{id:'forest'});
  assert.equal(g.state.combat?.id,'wolf','Normal wildlife must resume immediately after Finish or Skip');
 }
});
test('guide rests before a trip that would leave too little energy to explore',()=>{
 const g=journey();g.state.stats.stamina=20;
 assert.equal(g.reason('travel',{id:'forest'}),null);
 assert.equal(guideStep(g,'camp',null).action,'rest');
 assert.ok(g.perform('rest').ok);g.state.receipt=null;
 assert.equal(guideStep(g,'camp',null).location,'forest');
 assert.ok(g.perform('travel',{id:'forest'}).ok);assert.ok(g.perform('explore').ok);
 assert.ok(g.state.stats.stamina>=15);
});
test('the final tutorial handoff recovers energy before unlocking normal encounters',()=>{
 const g=journey();g.state.location='forest';g.state.tutorial.step=8;g.state.stats.stamina=15;
 assert.equal(guideStep(g,'camp',null).action,'rest');
 for(let i=0;i<2;i++){assert.ok(g.perform('rest').ok);g.state.receipt=null;}
 assert.equal(guideStep(g,'camp',null).finish,true);assert.ok(g.state.stats.stamina>=40);
});
test('a saved tutorial ambush is released without fake victory, loot or stat resets',()=>{
 const g=journey();g.state.location='forest';g.state.stats.stamina=2;beginCombat(g.state,content,'wolf');
 const before=structuredClone({time:g.state.time,stats:g.state.stats,items:g.state.items,counters:g.state.counters,quests:g.state.quests,seed:g.state.seed});
 assert.equal(reconcileGuide(g.state,content),true);assert.equal(g.state.combat,null);
 assert.deepEqual({time:g.state.time,stats:g.state.stats,items:g.state.items,counters:g.state.counters,quests:g.state.quests,seed:g.state.seed},before);
 assert.equal(g.reason('rest'),null);assert.equal(reconcileGuide(g.state,content),false);
 const normal=journey();normal.state.tutorial.active=false;beginCombat(normal.state,content,'wolf');
 reconcileGuide(normal.state,content);assert.equal(normal.state.combat?.id,'wolf');
});
test('a queued tutorial event cannot block rest after resuming an old save',()=>{
 const g=journey();g.state.event=Object.keys(content.events)[0];
 const items=structuredClone(g.state.items);
 assert.equal(reconcileGuide(g.state,content),true);assert.equal(g.state.event,null);
 assert.equal(g.reason('rest'),null);assert.deepEqual(g.state.items,items);
});
test('first steps keep needs gentle and restore the selected difficulty after Finish or Skip',()=>{
 for(const step of [0,8]){
  const g=journey();g.state.difficulty='relentless';
  let water=g.state.stats.hydration;
  assert.ok(g.perform('rest').ok);
  assert.ok(Math.abs(water-g.state.stats.hydration-63)<1e-9);
  g.state.tutorial={step,active:false};water=g.state.stats.hydration;
  assert.ok(g.perform('rest').ok);
  assert.ok(Math.abs(water-g.state.stats.hydration-134.4)<1e-9);
 }
});
test('the displayed route danger agrees with tutorial protection and returns afterwards',()=>{
 const g=journey();g.state.location='forest';
 assert.equal(g.status().danger,0);
 g.state.tutorial.active=false;assert.ok(g.status().danger>0);
});
