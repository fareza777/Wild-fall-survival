import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState, GameEngine } from '../web/game/engine.js';
import { loadSave, parseSave, validState } from '../web/game/storage.js';
const content=Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests'].map(async name=>[name,JSON.parse(await readFile(new URL(`../web/data/${name}.json`,import.meta.url),'utf8'))])));
test('saved simulation round-trips without losing quests, equipment, or RNG',()=>{
  const state=createState(content,{seed:13}); state.flags.journal=true;state.quests.completed=['first_night'];
  const save=parseSave(JSON.stringify({state,checkpoint:state}),content);
  assert.deepEqual(save.state,state);assert.deepEqual(save.checkpoint,state);
});
test('damaged and unknown-version saves are refused instead of crashing',()=>{
  assert.equal(parseSave('{broken',content),null);
  const state=createState(content);state.version=3;assert.equal(validState(state,content),false);
  state.version=1;state.stats.health=NaN;assert.equal(validState(state,content),false);
});
test('dead permadeath save cannot retain a recovery checkpoint',()=>{
  const state=createState(content,{permadeath:true}); const checkpoint=structuredClone(state);state.dead=true;state.stats.health=0;
  const save=parseSave(JSON.stringify({state,checkpoint}),content);assert.equal(save.checkpoint,null);
});
test('non-permadeath save preserves a live dawn checkpoint',()=>{
  const state=createState(content,{permadeath:false});const checkpoint=structuredClone(state);state.dead=true;state.stats.health=0;
  const save=parseSave(JSON.stringify({state,checkpoint}),content);assert.equal(save.checkpoint.dead,false);
});

test('incomplete camp state and impossible gear references are rejected',()=>{
  const state=createState(content);delete state.camp.fire;assert.equal(validState(state,content),false);
  state.camp.fire=0;state.equipment.tool='missing-tool';assert.equal(validState(state,content),false);
});

function withStores(local,native,check){
  const previous=Object.fromEntries(['localStorage','Android'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>local}});
  Object.defineProperty(globalThis,'Android',{configurable:true,value:{loadBackup:()=>native}});
  try{check();}finally{for(const [key,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}

test('a newer Android backup restores unread loot when WebView storage has an older valid save',()=>{
  const g=new GameEngine(content,null,{seed:2026});
  const local=JSON.stringify({state:g.state,savedAt:1000});
  g.perform('gather');
  const native=JSON.stringify({state:g.state,savedAt:2000});
  withStores(local,native,()=>{const restored=loadSave(content);assert.equal(restored.state.time,525);assert.equal(restored.state.receipt.kind,'gather');assert.deepEqual(restored.state.items,g.state.items);assert.equal(restored.state.seed,g.state.seed);});
});

test('a newer browser save wins over an older Android backup',()=>{
  const native=JSON.stringify({state:createState(content),savedAt:1000});
  const g=new GameEngine(content,null,{seed:2026});g.perform('gather');
  withStores(JSON.stringify({state:g.state,savedAt:2000}),native,()=>{const restored=loadSave(content);assert.equal(restored.state.time,525);assert.equal(restored.state.receipt.kind,'gather');});
});

test('a corrupted newer backup cannot replace a valid browser save',()=>{
  const local=JSON.stringify({state:createState(content),savedAt:1000});
  const damaged=createState(content);damaged.stats.health=-1;
  withStores(local,JSON.stringify({state:damaged,savedAt:2000}),()=>assert.equal(loadSave(content).state.stats.health,100));
});
