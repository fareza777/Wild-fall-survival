import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameEngine} from '../web/game/engine.js';
import {progressGuide,guideStep} from '../web/ui/guide.js';
import {journalView} from '../web/ui/journey-view.js';
import {updateQuests} from '../web/game/quests.js';
const c=Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests','story'].map(async n=>[n,JSON.parse(await readFile(`web/data/${n}.json`,'utf8'))])));
const game=()=>new GameEngine(c,null,{seed:2026,scenario:'cold_trail'});
function consume(g,id){assert.equal(g.perform('use',{id}).ok,true);progressGuide(g.state,'use',{id},c);g.state.receipt=null;}

test('food and water used during construction count toward the later tutorial lesson',()=>{
 const g=game();g.state.tutorial={step:2,active:true,version:2,usedWater:false,usedFood:false};
 consume(g,'water');consume(g,'ration');assert.equal(g.state.items.water||0,0);assert.equal(g.state.items.ration||0,0);
 assert.equal(g.state.tutorial.usedWater,true);assert.equal(g.state.tutorial.usedFood,true);
 Object.assign(g.state.camp,{shelter:1,firepit:true,fire_cover:true,fire:400});progressGuide(g.state,'craft',{id:'fire_cover'},c);
 assert.equal(g.state.tutorial.step,7);assert.ok(!guideStep(g,'pack',null).selector.includes('[data-id="water"]'));
});
test('tutorial chooses safe tea and berries when original bottles and rations are gone',()=>{
 const g=game();g.state.items={tea:1,berries:2};g.state.tutorial={step:6,active:true,version:2};
 const drink=guideStep(g,'pack',null);assert.equal(drink.item,'tea');consume(g,drink.item);
 const food=guideStep(g,'pack',null);assert.equal(food.item,'berries');consume(g,food.item);
 assert.equal(g.state.tutorial.step,7);
});
test('a depleted safe-water lesson leads to boiling carried river water, never a missing use control',()=>{
 const g=game();Object.assign(g.state.camp,{shelter:1,firepit:true,fire_cover:true,fire:500});
 for(const id of ['cooking_pot','canteen'])g.state.gear.push({id,uid:`${id}-${g.state.nextGear++}`,durability:c.items[id].durability});
 g.state.items={dirty_water:2,berries:3};g.state.tutorial={step:6,active:true,version:2,usedFood:true};
 const next=guideStep(g,'craft',null);assert.equal(next.recipe,'water');assert.equal(g.reason('craft',{id:next.recipe}),null);
 assert.equal(g.perform('craft',{id:next.recipe}).ok,true);g.state.receipt=null;
 assert.equal(guideStep(g,'pack',null).item,'water');consume(g,'water');assert.equal(g.state.tutorial.step,7);
});
test('old stuck tutorials recover actual earlier consumption from save history only once',async()=>{
 const g=game();g.state.tutorial={step:2,active:true,usedWater:false,usedFood:false};
 assert.ok(g.perform('use',{id:'water'}).ok);assert.ok(g.perform('use',{id:'ration'}).ok);
 g.state.tutorial.step=6;
 const {reconcileGuide}=await import('../web/ui/guide.js');assert.equal(typeof reconcileGuide,'function');
 assert.equal(reconcileGuide(g.state,c),true);assert.equal(g.state.tutorial.step,7);assert.equal(g.state.tutorial.version,2);
 assert.equal(reconcileGuide(g.state,c),false);
 // A deliberately replayed guide must teach the actions again, despite old logs.
 g.state.tutorial={step:6,active:true,version:2,usedWater:false,usedFood:false};reconcileGuide(g.state,c);
 assert.equal(g.state.tutorial.step,6);assert.equal(g.state.tutorial.usedWater,false);
});
test('unsafe water and raw meat do not satisfy safe-supply lessons',()=>{
 const g=game();g.state.tutorial={step:6,active:true,version:2,usedWater:false,usedFood:false};g.state.items={dirty_water:1,raw_meat:1};
 consume(g,'dirty_water');consume(g,'raw_meat');assert.equal(g.state.tutorial.step,6);assert.equal(g.state.tutorial.usedWater,false);assert.equal(g.state.tutorial.usedFood,false);
});
test('unwritten main chapters cannot be revealed by changing Journal pages',()=>{
 const g=game();for(const page of [null,1,4,999]){const html=journalView(g,'main',page);assert.ok(html.includes('Before Nightfall'));for(const q of c.quests.main.slice(1))assert.ok(!html.includes(q.title),'Future title leaked: '+q.id);}
 g.state.quests.completed.push('first_night');const html=journalView(g,'main');assert.ok(html.includes('The Ranger’s Trail'));assert.ok(!html.includes('Fragments of a Signal'));
});
test('side objectives emerge from discoveries; completed legacy objectives remain readable',()=>{
 const g=game(),initial=journalView(g,'side');for(const q of c.quests.side)assert.ok(!initial.includes(q.title));
 g.state.camp.shelter=1;assert.ok(journalView(g,'side').includes('Night Reserve'));
 g.state.visited.push('river');assert.ok(journalView(g,'side',1).includes('Every Drop'));
 g.state.quests.completed.push('angler');assert.ok(journalView(g,'side',999).includes('River Patience'));
});
test('hidden objective conditions cannot grant an undiscovered reward',()=>{
 const g=game();g.state.counters.fishCaught=3;const content={...c,quests:{main:[],side:[{...c.quests.side.find(q=>q.id==='angler'),unlock:[{visited:'river'}]}]}};
 let rewards=0;assert.deepEqual(updateQuests(g.state,content,()=>rewards++),[]);assert.equal(rewards,0);
 g.state.visited.push('river');assert.equal(updateQuests(g.state,content,()=>rewards++).length,1);assert.equal(rewards,1);
});
test('all 54 guided scenario/difficulty/seed combinations finish without ambushes and with energy for normal play',()=>{
 for(const scenario of Object.keys(c.scenarios))for(const difficulty of ['story','survivor','relentless'])for(const seed of [7103,2026,53,8731,112,992]){
  const g=new GameEngine(c,null,{scenario,difficulty,seed}),s=g.state;s.tutorial={step:1,version:2,active:true,usedWater:false,usedFood:false};
  for(let i=0;i<320&&s.tutorial.active&&!s.dead;i++){
   if(s.receipt){s.receipt=null;continue;}
   assert.equal(s.combat,null);assert.equal(s.event,null);
   let kind,options={};
   const next=guideStep(g,'camp',null);
   if(next.finish){s.tutorial.active=false;break;}
   if(next.item){kind=next.drop?'drop':'use';options.id=next.item;}else if(next.recipe){kind='craft';options.id=next.recipe;}else if(next.map){kind='travel';options.id=next.location;}else kind=next.action;
   const result=g.perform(kind,options);assert.ok(result.ok,JSON.stringify({scenario,difficulty,seed,i,step:s.tutorial.step,kind,options,reason:result.message}));progressGuide(s,kind,options,c);
  }
  const detail=JSON.stringify({scenario,difficulty,seed,stats:s.stats,items:s.items,step:s.tutorial.step});
  assert.equal(s.dead,false,detail);assert.equal(s.tutorial.active,false,detail);
  assert.equal(s.tutorial.step,8,detail);assert.ok(s.stats.stamina>=40,detail);
 }
});
