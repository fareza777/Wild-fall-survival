import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GameEngine} from '../web/game/engine.js';
import {advanceTime,fireBurnRate} from '../web/game/survival.js';
import {englishHistory} from '../web/game/legacy.js';
import {validState} from '../web/game/storage.js';
import {actionDescription} from '../web/ui/game-view.js';
const c=Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests'].map(async n=>[n,JSON.parse(await readFile(new URL(`../web/data/${n}.json`,import.meta.url),'utf8'))])));
const game=()=>new GameEngine(c,null,{seed:2026});
test('preview is pure and shares metabolism with the actual action, including rain and injury',()=>{
 const g=game();g.state.weather='rain';g.state.stats.injury=40;
 const initial=structuredClone(g.state),p=g.preview('gather');assert.deepEqual(g.state,initial);
 assert.equal(g.effort('gather'),10*1.15*(1+40/180));
 const r=g.perform('gather');assert.ok(r.ok);
 for(const k of ['stamina','calories','hydration','temperature','fatigue','health'])assert.equal(g.state.stats[k],p.stats[k]);
 assert.equal(r.effects.minutes,45);assert.equal(r.effects.gained.wood,g.state.items.wood-initial.items.wood);
 assert.equal(r.effects.stats.calories,g.state.stats.calories-initial.stats.calories);
});
test('travel neither borrows the camp roof nor returns before its final environment is simulated',()=>{
 const a=game(),b=game();for(const g of [a,b]){g.state.camp.shelter=3;g.state.camp.fire=600;g.state.weather='snow';g.state.time=20*60;}
 b.state.location='forest';const p=a.preview('travel',{id:'forest'});
 advanceTime(b.state,c,25,5,{travelling:true});
 assert.equal(a.perform('travel',{id:'forest'}).ok,true);
 assert.equal(a.state.stats.temperature,b.state.stats.temperature);assert.equal(a.state.stats.temperature,p.stats.temperature);
});
test('rain extinguishes an exposed campfire while away; a sleeping shelter does not cover it',()=>{
 const g=game();g.state.location='forest';g.state.weather='rain';g.state.camp.fire=120;
 advanceTime(g.state,c,60,0);assert.equal(g.state.camp.fire,0);
 g.state.camp.shelter=1;g.state.camp.fire=120;advanceTime(g.state,c,60,0);assert.equal(g.state.camp.fire,0);
 g.state.camp.fire_cover=true;g.state.camp.fire=120;advanceTime(g.state,c,60,0);assert.equal(g.state.camp.fire,60);assert.equal(fireBurnRate(g.state,c),1);
});
test('cooking checks the full fuel budget at the weather burn rate',()=>{
 const g=game();g.state.gear.push({id:'cooking_pot',uid:'test-pot',durability:c.items.cooking_pot.durability});g.state.weather='rain';g.state.camp.fire_cover=true;g.state.camp.fire=14;g.state.items.dirty_water=2;
 assert.ok(g.reason('craft',{id:'water'}));g.state.camp.fire=15;assert.equal(g.reason('craft',{id:'water'}),null);
 assert.equal(g.perform('craft',{id:'water'}).ok,true);assert.equal(g.state.camp.fire,0);
});
test('refueling extends the fire before the action elapses; preview and fuel agree',()=>{
 const g=game();g.state.camp.firepit=true;g.state.camp.fire=5;g.state.items={wood:2};const p=g.preview('fire');
 assert.equal(g.perform('fire').ok,true);assert.equal(g.state.camp.fire,350);assert.equal(g.state.stats.temperature,p.stats.temperature);assert.equal(g.state.items.fiber,undefined);
});
test('radio transmission cannot finish after daylight ends',()=>{
 const g=game();g.state.location='summit';g.state.items.radio=1;g.state.time=18*60+45;
 assert.equal(g.perform('signal').ok,false);g.state.time=18*60+29;assert.equal(g.perform('signal').ok,true);
});
test('battle animation telemetry equals health changes and reports overkill without phantom damage',()=>{
 const g=game();g.state.combat={id:'wolf',health:1,maxHealth:38,turn:0,messages:[]};const hp=g.state.stats.health;
 const r=g.perform('combat',{move:'power'});assert.equal(r.effects.battle.damageDealt,1);assert.equal(r.effects.battle.damageTaken,0);assert.equal(r.effects.battle.victory,true);
 assert.equal(g.state.stats.health,hp);
});
test('death cannot complete a quest or grant new reward supplies',()=>{
 const g=game();g.state.camp.shelter=1;g.state.camp.firepit=true;g.state.counters.fires=1;g.state.time=23*60+59;g.state.stats.health=.01;g.state.stats.hydration=0;
 const r=g.perform('rest');assert.equal(r.dead,true);assert.deepEqual(r.quests,[]);assert.equal(g.state.quests.completed.length,0);
});
test('combat healing respects the health cap before the enemy counterattack',()=>{
 const g=game();g.state.items.medicine=1;g.state.stats.health=100;g.state.combat={id:'wolf',health:38,maxHealth:38,turn:0,messages:[]};
 const r=g.perform('use',{id:'medicine'});assert.ok(r.effects.battle.damageTaken>0);assert.ok(g.state.stats.health<100);assert.equal(g.state.stats.health,100-r.effects.battle.damageTaken);
});
test('action descriptions use the current location loot tables',()=>{
 const g=game();g.state.location='cabin';assert.equal(actionDescription(g,'gather'),'Scrap · Wood · Fiber');g.state.location='mountain';assert.equal(actionDescription(g,'forage'),'Herbs');
});
test('v1 save history remains readable in English and equipment counters remain validated',()=>{
 assert.equal(englishHistory('Diperoleh: 3 kayu, 2 batu.'),'Collected: 3 firewood, 2 flint stone.');
 assert.equal(englishHistory('Kamu menemukan catatan penjaga.'),'Found ranger journal.');
 const g=game();const old=structuredClone(g.state);old.gear[0].durability=999;assert.equal(validState(old,c),false);const incomplete=structuredClone(g.state);delete incomplete.counters.fires;assert.equal(validState(incomplete,c),false);
});
test('nature audio implementation contains no oscillators or music samples',async()=>{
 const source=await readFile(new URL('../web/ui/audio.js',import.meta.url),'utf8');assert.doesNotMatch(source,/createOscillator\s*\(/);
 const pack=await readFile(new URL('../tools/prepare-audio.mjs',import.meta.url),'utf8');assert.doesNotMatch(pack,/impactBell|synth|piano|guitar|music\.ogg/i);
});
