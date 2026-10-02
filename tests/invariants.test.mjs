import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameEngine} from '../web/game/engine.js';
import {validState} from '../web/game/storage.js';
const c=Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests'].map(async n=>[n,JSON.parse(await readFile(new URL(`../web/data/${n}.json`,import.meta.url),'utf8'))])));
test('seeded public-action runs preserve save, resource, stat, and durability invariants in all modes',()=>{
 let actions=0,runs=0;
 for(const scenario of Object.keys(c.scenarios))for(const difficulty of ['story','survivor','relentless'])for(let seed=1;seed<=8;seed++){
  const g=new GameEngine(c,null,{scenario,difficulty,seed:seed*7189,permadeath:seed%2===0});runs++;
  for(let turn=0;turn<140&&!g.state.dead;turn++){
   const s=g.state;let candidates=[];
   if(s.combat)candidates=['attack','power','defend','flee'].map(move=>['combat',{move}]);
   else if(s.event)candidates=c.events[s.event].choices.map((_,choice)=>['resolveEvent',{choice}]);
   else{
    candidates=c.locations[s.location].actions.map(a=>[a,{}]);
    candidates.push(...Object.keys(c.locations).map(id=>['travel',{id}]),...Object.keys(c.recipes).map(id=>['craft',{id}]),...Object.keys(s.items).map(id=>['use',{id}]),...s.gear.map(x=>['equip',{uid:x.uid}]),...s.gear.map(x=>['repair',{uid:x.uid}]));
    if(s.location==='camp')candidates.push(['sleep',{}]);
   }
   const valid=candidates.filter(([a,o])=>!g.reason(a,o));assert.ok(valid.length,'A living survivor must have a legal response');
   const choice=valid[(seed*13+turn*47)%valid.length],before=structuredClone(s),result=g.perform(...choice);assert.equal(result.ok,true);actions++;
   assert.ok(validState(s,c),`${scenario}/${difficulty}/${seed}/${turn} produced an invalid save after ${choice[0]}`);
   assert.equal(result.effects.minutes,s.time-before.time);
   for(const [id,n] of Object.entries(result.effects.gained))assert.ok(n>0&&Number.isInteger(n)&&c.items[id]);
   for(const gear of s.gear)assert.ok(gear.durability>=0&&gear.durability<=c.items[gear.id].durability);
   if(s.dead)assert.equal(g.perform('rest').ok,false);
  }
 }
 assert.equal(runs,72);assert.ok(actions>1000);
});
