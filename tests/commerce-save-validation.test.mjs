import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createState} from '../web/game/engine.js';
import {parseSave} from '../web/game/storage.js';
const content=Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests'].map(async n=>[n,JSON.parse(await readFile(`web/data/${n}.json`,'utf8'))])));
test('corrupt reward metadata is rejected before loading; legacy saves stay compatible',()=>{
 const fresh=createState(content),legacy=structuredClone(fresh);delete legacy.support;delete legacy.runId;delete legacy.toolsVersion;
 assert.ok(parseSave(JSON.stringify({state:legacy}),content));
 assert.ok(parseSave(JSON.stringify({state:fresh}),content));
 for(const edit of [s=>s.support={},s=>s.support.claimed=null,s=>s.support.claimed=['invalid'],s=>s.support.day=-1,s=>s.support.day=Infinity,s=>s.runId=17,s=>s.runId='bad/run',s=>s.toolsVersion='1']){
  const state=structuredClone(fresh);edit(state);assert.equal(parseSave(JSON.stringify({state}),content),null);
 }
});
