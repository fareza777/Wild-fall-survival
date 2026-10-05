import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameEngine,createState} from '../web/game/engine.js';
import {guideStep} from '../web/ui/guide.js';
import {validState} from '../web/game/storage.js';
import {englishHistory} from '../web/game/legacy.js';
import {resultView} from '../web/ui/results-view.js';
const content=Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests'].map(async id=>[id,JSON.parse(await readFile(`web/data/${id}.json`,'utf8'))])));
const kit=['cooking_pot','canteen','fire_drill'];
function v140(){const s=createState(content);s.toolsVersion=1;s.gear=['knife',...kit].map((id,i)=>({id,uid:`${id}-${i+1}`,durability:content.items[id].durability}));s.nextGear=5;return s;}

test('new scenarios start with the narrated salvaged knife; every camp utensil must be earned',()=>{
 for(const scenario of Object.keys(content.scenarios)){const g=new GameEngine(content,null,{scenario});assert.deepEqual(g.state.gear.map(x=>x.id),['knife']);assert.equal(g.state.toolsVersion,2);for(const id of kit)assert.ok(content.recipes[id]);}
});
test('pre-tools saves never gain cookware or containers while loading',()=>{
 const old=v140();delete old.toolsVersion;old.gear=old.gear.slice(0,1);old.nextGear=2;
 const upgraded=new GameEngine(content,old);assert.deepEqual(upgraded.state.gear,old.gear);assert.equal(upgraded.state.time,old.time);assert.deepEqual(upgraded.state.stats,old.stats);
});
test('untouched v1.4 starter gifts are withdrawn once, without deleting crafted duplicates or resetting progress',()=>{
 const old=v140();old.gear.push({id:'cooking_pot',uid:'cooking_pot-5',durability:90,origin:'crafted'});old.nextGear=6;
 const g=new GameEngine(content,old);assert.deepEqual(g.state.gear.map(x=>x.uid),['knife-1','cooking_pot-5']);assert.deepEqual(g.state.items,old.items);assert.deepEqual(g.state.stats,old.stats);assert.equal(g.state.time,old.time);assert.equal(g.state.nextGear,old.nextGear);assert.ok(validState(g.state,content));assert.deepEqual(new GameEngine(content,g.state).state.gear,g.state.gear);
});
test('used or repaired starter tools remain owned, and incomplete historical evidence cannot revoke gear',()=>{
 const used=v140();used.gear[1].durability=88;used.logs.push({id:1,time:used.time,text:'Equipment repaired: up to +40 durability.',tone:'normal'});used.nextLog=2;
 const g=new GameEngine(content,used);assert.deepEqual(g.state.gear,used.gear);
 const incomplete=v140();incomplete.logs=[{id:150,time:incomplete.time,text:'Rest complete.',tone:'normal'}];incomplete.nextLog=151;assert.deepEqual(new GameEngine(content,incomplete).state.gear,incomplete.gear);
});
test('fresh craft provenance prevents legitimately crafted low UID tools from being mistaken for gifts',()=>{
 const g=new GameEngine(content,null,{seed:2026});Object.assign(g.state.items,{scrap:3,fiber:5,wood:4});
 for(const id of kit){assert.ok(g.perform('craft',{id}).ok,id);const tool=g.state.gear.find(x=>x.id===id);assert.equal(tool.origin,'crafted');}
 assert.deepEqual(new GameEngine(content,g.state).state.gear,g.state.gear);
});
test('camp gathering can supply a first pot and canteen, but wreck metal is finite and full packs leave it available',()=>{
 const g=new GameEngine(content,null,{seed:1});g.state.tutorial={active:true,step:1};g.state.nextWeather=1e8;let found=0;
 for(let i=0;i<100;i++){Object.assign(g.state.stats,{stamina:100,health:100,calories:2800,hydration:2500,fatigue:0});g.state.items={};const result=g.perform('gather');assert.ok(result.ok);found+=result.effects.gained.scrap||0;}
 assert.equal(found,5);assert.equal(g.state.flags.wreck_scrap_remaining,0);
 const full=new GameEngine(content,null,{seed:1});full.state.items={stone:100};for(let i=0;i<5;i++){full.state.stats.stamina=100;assert.ok(full.perform('gather').ok);full.state.event=null;full.state.combat=null;}assert.equal(full.state.flags.wreck_scrap_remaining,5);
});
test('the guide crafts a vessel before sending an empty-handed beginner to the river',()=>{
 const g=new GameEngine(content,null,{scenario:'riverborn'});g.state.tutorial={active:true,step:6,version:2,usedFood:true,usedWater:false};g.state.items={scrap:1,fiber:2,wood:4,ration:2};
 const hint=guideStep(g,'craft',null);assert.equal(hint.recipe,'canteen');assert.equal(g.reason('craft',{id:hint.recipe}),null);
});
test('all catalog text is valid English Unicode, including batch recipe names and historical receipts',()=>{
 const scan=(x,path)=>{if(typeof x==='string')assert.doesNotMatch(x,/Ã|Â|â€|\uFFFD/,path);else if(x&&typeof x==='object')for(const [key,value] of Object.entries(x))scan(value,path+'.'+key);};scan(content,'content');
 assert.equal(content.recipes.water.name,'Clean water ×2');assert.equal(content.recipes.bandage.name,'Linen bandages ×2');assert.equal(content.recipes.arrows.name,'Flint arrows ×5');assert.equal(englishHistory('Completed: 2 Ã— clean water.'),'Completed: 2 × clean water.');
});
test('an exhausted wreck directs tool preparation toward cabin salvage instead of endless camp gathering',()=>{
 const g=new GameEngine(content,null,{scenario:'riverborn'});g.state.flags.wreck_scrap_remaining=0;g.state.items={wood:5,fiber:5,water:2,ration:2};g.state.tutorial={active:true,version:2,step:7,usedWater:true,usedFood:true};
 const next=guideStep(g,'camp',null);assert.equal(next.location,'river');assert.ok(g.perform('travel',{id:next.location}).ok);g.state.receipt=null;assert.equal(guideStep(g,'camp',null).action,'explore');assert.ok(g.perform('explore').ok);g.state.receipt=null;assert.equal(guideStep(g,'camp',null).location,'cabin');
});

test('historical unread batch results render clean text while retaining the exact pending reward and cost',()=>{
 const previous=globalThis.window;globalThis.window={innerWidth:412};
 try{
  const g=new GameEngine(content);
  for(const [id,message] of [['water','Completed: 2 Ã— clean water.'],['bandage','Completed: 2 Ã— linen bandage.'],['arrows','Completed: 5 Ã— flint arrows.']]){
   g.state.receipt={kind:'craft',options:{id},message,effects:{gained:{[id]:content.recipes[id].quantity},left:{},stats:{stamina:-8},minutes:25},notes:[],quests:[]};
   const before=structuredClone(g.state.receipt),html=resultView(g);
   assert.doesNotMatch(html,/Ã|Â|â€|\uFFFD/);assert.ok(html.includes(englishHistory(message)));assert.deepEqual(g.state.receipt,before);
  }
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
