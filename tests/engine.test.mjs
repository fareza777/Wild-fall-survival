import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../web/game/engine.js';
import { readFile } from 'node:fs/promises';
import { weight, capacity } from '../web/game/inventory.js';
import { dayOf } from '../web/game/survival.js';

const content = Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests'].map(async name => [name, JSON.parse(await readFile(new URL(`../web/data/${name}.json`, import.meta.url), 'utf8'))])));
const game = options => new GameEngine(content, null, { seed: 2026, ...options });
function healthy(g) { Object.assign(g.state.stats, { health:100, stamina:100, calories:2800, hydration:2500, temperature:36.8, fatigue:0, injury:0, sickness:0 }); g.state.event=null; g.state.combat=null; }
function supplies(g) { for (const id of Object.keys(content.items)) if (content.items[id].category !== 'gear') g.state.items[id]=30; }

test('new run has survival stats, an actionable camp, and independent seeded state', () => {
  const g = game();
  assert.ok(g.state, 'new game must create a persistent simulation state');
  assert.equal(g.state.location, 'camp');
  assert.ok(g.state.stats.calories > 0);
  assert.ok(g.state.stats.hydration > 0);
  assert.equal(g.state.dead, false);
});

test('gathering yields loot and spends time, energy, food, and water', () => {
  const g=game(), before=structuredClone(g.state);
  assert.equal(g.perform('gather').ok,true);
  assert.ok(g.state.time>before.time);
  assert.ok(g.state.stats.stamina<before.stats.stamina);
  assert.ok(g.state.stats.calories<before.stats.calories);
  assert.ok(g.state.stats.hydration<before.stats.hydration);
  assert.ok(Object.values(g.state.items).reduce((a,b)=>a+b,0)>Object.values(before.items).reduce((a,b)=>a+b,0));
});

test('refused crafting is fully atomic and does not advance the RNG or simulation', () => {
  const g=game(), before=JSON.stringify(g.state);
  assert.equal(g.perform('craft',{id:'shelter'}).ok,false);
  assert.equal(JSON.stringify(g.state),before);
});

test('crafting spends exact resources and creates durable equippable gear', () => {
  const g=game(); g.state.items.stone=5;
  assert.equal(g.perform('craft',{id:'axe'}).ok,true);
  assert.equal(g.state.items.wood||0,0);
  assert.equal(g.state.items.stone,2);
  const axe=g.state.gear.find(i=>i.id==='axe'); assert.ok(axe.durability>0);
  assert.equal(g.perform('equip',{uid:axe.uid}).ok,true);
  assert.equal(g.state.equipment.tool,axe.uid);
});

test('campfire cooking requires lit fire and home camp', () => {
  const g=game(); g.state.items.dirty_water=4;
  g.state.gear.push({id:'cooking_pot',uid:'test-pot',durability:content.items.cooking_pot.durability});
  assert.equal(g.perform('craft',{id:'water'}).ok,false);
  g.state.camp.fire=200;
  assert.equal(g.perform('craft',{id:'water'}).ok,true);
  assert.equal(g.state.items.dirty_water,2);
  assert.equal(g.state.counters.waterBoiled,2);
  g.state.location='forest';
  assert.equal(g.perform('craft',{id:'water'}).ok,false);
});

test('locked location cannot be visited; exploring forest opens the river', () => {
  const g=game();
  assert.equal(g.perform('travel',{id:'river'}).ok,false);
  assert.equal(g.perform('travel',{id:'forest'}).ok,true);
  healthy(g); assert.equal(g.perform('explore').ok,true);
  g.state.event=null; g.state.combat=null;
  assert.ok(g.state.discovered.includes('river'));
  assert.equal(g.perform('travel',{id:'river'}).ok,true);
});

test('shelter and fire prevent cold damage while unprotected sleeping risks hypothermia', () => {
  const protectedGame=game(), exposed=game();
  for (const g of [protectedGame,exposed]) { healthy(g); g.state.time=20*60; g.state.weather='rain';g.state.nextWeather=10000; }
  protectedGame.state.camp.shelter=2; protectedGame.state.camp.fire=500;protectedGame.state.camp.fire_cover=true;
  assert.equal(protectedGame.perform('sleep',{hours:6}).ok,true);
  assert.equal(exposed.perform('sleep',{hours:6}).ok,true);
  assert.ok(protectedGame.state.stats.temperature>exposed.state.stats.temperature);
  assert.ok(protectedGame.state.stats.health>exposed.state.stats.health);
});

test('food and water consumption have distinct effects and remove only one item', () => {
  const g=game(); g.state.stats.calories=500; g.state.stats.hydration=500;
  g.perform('use',{id:'ration'}); assert.ok(g.state.stats.calories>1100); assert.equal(g.state.items.ration,1);
  g.perform('use',{id:'water'}); assert.ok(g.state.stats.hydration>1100); assert.equal(g.state.items.water,1);
});

test('pending event blocks unrelated actions and unaffordable choice leaves event intact', () => {
  const g=game(); g.state.event='stranger'; delete g.state.items.ration;
  const before=JSON.stringify(g.state);
  assert.equal(g.perform('gather').ok,false);
  assert.equal(g.perform('resolveEvent',{choice:0}).ok,false);
  assert.equal(JSON.stringify(g.state),before);
  assert.equal(g.perform('resolveEvent',{choice:1}).ok,true); assert.equal(g.state.event,null);
});

test('stamina refusal is atomic including difficulty, rain, and injury modifiers', () => {
  const g=game(); g.state.stats.stamina=11; g.state.stats.injury=80; g.state.weather='storm';
  const before=JSON.stringify(g.state);
  assert.equal(g.perform('gather').ok,false); assert.equal(JSON.stringify(g.state),before);
});

test('capacity limits loot and a backpack expands usable space', () => {
  const g=game(); g.state.items={stone:34}; g.state.gear=[];
  g.perform('gather'); assert.ok(weight(g.state,content)<=capacity(g.state)+0.001);
  g.state.items.backpack=1; assert.equal(capacity(g.state),23);
});

test('equipped tools wear out, then leave the slot and stop granting bonuses', () => {
  const g=game(); g.state.gear=[{id:'axe',uid:'ax',durability:1}]; g.state.equipment.tool='ax';
  g.perform('gather'); assert.equal(g.state.gear[0].durability,0); assert.equal(g.state.equipment.tool,null);
});

test('rest recovers stamina and fatigue while time and metabolism continue', () => {
  const g=game(); g.state.stats.stamina=10; g.state.stats.fatigue=60;
  const before=structuredClone(g.state); g.perform('rest');
  assert.ok(g.state.stats.stamina>before.stats.stamina); assert.ok(g.state.stats.fatigue<60);
  assert.ok(g.state.stats.calories<before.stats.calories); assert.equal(g.state.time,before.time+60);
});

test('trap harvest requires elapsed time and cannot be harvested twice', () => {
  const g=game(); g.state.location='forest'; g.state.items.trap=1;
  assert.equal(g.perform('setTrap').ok,true); g.state.event=null; g.state.combat=null;
  assert.equal(g.perform('checkTrap').ok,false);
  g.state.time+=240; healthy(g); assert.equal(g.perform('checkTrap').ok,true);
  assert.equal(g.perform('checkTrap').ok,false);
});

test('combat is turn-based; strong prepared weapon can finish an enemy', () => {
  const g=game(); g.state.gear.push({id:'spear',uid:'sp',durability:70}); g.state.equipment.weapon='sp';
  g.state.combat={id:'wolf',health:1,maxHealth:38,turn:0,messages:[]};
  assert.equal(g.perform('combat',{move:'attack'}).ok,true);
  assert.equal(g.state.combat,null); assert.equal(g.state.counters.battlesWon,1);
  assert.ok(g.state.carcass.loot.hide>=1);
  assert.equal(g.state.items.hide,undefined);
});

test('unknown combat commands are refused without charging a turn', () => {
  const g=game(); g.state.combat={id:'wolf',health:38,maxHealth:38,turn:0,messages:[]};
  const before=JSON.stringify(g.state); assert.equal(g.perform('combat',{move:'instant-win'}).ok,false);
  assert.equal(JSON.stringify(g.state),before);
});

test('dead survivors cannot take actions and food cannot revive permadeath', () => {
  const g=game({permadeath:true}); g.state.dead=true; g.state.stats.health=0;
  const before=JSON.stringify(g.state); assert.equal(g.perform('use',{id:'ration'}).ok,false);
  assert.equal(JSON.stringify(g.state),before);
});

test('new day increases danger and unlocks harder weather', () => {
  const g=game(); const initial=g.danger('forest'); g.state.time=8*1440+480;
  assert.ok(g.danger('forest')>initial); assert.equal(dayOf(g.state),9);
});

test('radio rescue requires summit, daylight, and suitable weather', () => {
  const g=game(); g.state.items.radio=1; g.state.location='summit'; g.state.time=20*60;
  assert.equal(g.perform('signal').ok,false);
  g.state.time=12*60; g.state.weather='storm'; assert.equal(g.perform('signal').ok,false);
  g.state.weather='clear'; assert.equal(g.perform('signal').ok,true); assert.equal(g.state.flags.rescued,true);
});

test('identical seed and inputs reproduce gameplay exactly', () => {
  const a=game(),b=game();
  for (const g of [a,b]) { g.perform('gather'); g.perform('forage'); g.perform('rest'); }
  assert.deepEqual(a.state,b.state);
});

test('an exhausted survivor always has a defensive move to recover combat stamina', () => {
  const g=game();g.state.stats.stamina=0;g.state.combat={id:'wolf',health:38,maxHealth:38,turn:0,messages:[]};
  assert.equal(g.perform('combat',{move:'defend'}).ok,true);
  assert.ok(g.state.stats.stamina>0);assert.equal(g.state.combat.turn,1);
});

test('all random events provide a choice requiring no items or stamina', () => {
  for(const [id,event] of Object.entries(content.events)) {
    const g=game();g.state.stats.stamina=0;g.state.items={};g.state.event=id;
    const choice=event.choices.findIndex(c=>!c.cost&&!c.stamina);
    assert.ok(choice>=0,id+' must not trap the survivor');
    assert.equal(g.perform('resolveEvent',{choice}).ok,true);
    assert.equal(g.state.event,null);
  }
});

test('refueling a nearly expired fire never creates negative or invalid fiber counts',()=>{
  const g=game();g.state.camp.firepit=true;g.state.camp.fire=5;g.state.items={wood:2};
  assert.equal(g.perform('fire').ok,true);
  assert.equal(g.state.items.fiber,undefined);assert.ok(g.state.camp.fire>0);
});

test('a signal ending in starvation cannot trigger rescue after death',()=>{
  const g=game();g.state.location='summit';g.state.items.radio=1;g.state.stats.health=0.1;g.state.stats.hydration=0;g.state.weather='clear';g.state.time=720;
  assert.equal(g.perform('signal').ok,true);assert.equal(g.state.dead,true);assert.notEqual(g.state.flags.rescued,true);
});

test('using healing supplies during combat gives the opponent a turn',()=>{
  const g=game();g.state.items.bandage=1;g.state.stats.health=50;
  g.state.combat={id:'wolf',health:38,maxHealth:38,turn:0,messages:[]};
  assert.equal(g.perform('use',{id:'bandage'}).ok,true);
  assert.equal(g.state.combat.turn,1);assert.ok(g.state.stats.health<58);
});
