import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState } from '../web/game/engine.js';
import { parseSave, validState } from '../web/game/storage.js';
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
