import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
const names=['items','recipes','locations','weather','enemies','events','scenarios','quests'];
const c=Object.fromEntries(await Promise.all(names.map(async n=>[n,JSON.parse(await readFile(`web/data/${n}.json`,'utf8'))])));
const checkCost=cost=>{for(const [id,n] of Object.entries(cost||{})){assert.ok(c.items[id],`unknown item ${id}`);assert.ok(Number.isInteger(n)&&n>0,`bad quantity for ${id}`);}};
for(const [id,item] of Object.entries(c.items)){assert.ok(item.weight>0);assert.ok(item.name&&item.description);assert.ok(item.art,`missing art for ${id}`);await access('web/'+item.art);if(item.category==='gear')assert.ok(item.durability>0&&item.slot);}
for(const [id,r] of Object.entries(c.recipes)){checkCost(r.cost);assert.ok(r.minutes>0&&r.stamina>=0);if(r.item)assert.ok(c.items[r.item]);else assert.ok(['firepit','shelter','garden','rain_collector'].includes(r.structure));}
for(const [id,l] of Object.entries(c.locations)){for(const n of l.neighbors){assert.ok(c.locations[n]);assert.ok(c.locations[n].neighbors.includes(id),`${id}-${n} must be bidirectional`);}for(const [item,r] of Object.entries(l.loot||{})){assert.ok(c.items[item]);assert.ok(r.length===2&&r[0]<=r[1]);}if(l.firstFind)assert.ok(c.items[l.firstFind]);}
for(const [id,e] of Object.entries(c.events)){assert.ok(e.choices.length>=2);assert.ok(e.choices.some(choice=>!choice.cost&&!choice.stamina),`${id} needs a zero-cost fallback`);for(const loc of e.locations)assert.ok(c.locations[loc]);for(const choice of e.choices){checkCost(choice.cost);checkCost(choice.loot);if(choice.combat)assert.ok(c.enemies[choice.combat]);}}
const ids=new Set();for(const q of [...c.quests.main,...c.quests.side]){assert.ok(!ids.has(q.id));ids.add(q.id);assert.ok(q.conditions.length);checkCost(q.reward);}
for(const group of ['recipes','locations','enemies','scenarios'])for(const [id,entry] of Object.entries(c[group])){assert.ok(entry.art,`${group}/${id} needs art`);await access('web/'+entry.art);}
const catalog=JSON.parse(await readFile('art/catalog.json','utf8'));
for(const asset of catalog){await access(asset.output);await access(asset.original);}
for(const name of ['tap','pack','equip','swing','draw','chop','leaf','step1','step2','snowstep','hit','heavy','guard','mine','craft','book'])await access(`web/assets/audio/${name}.ogg`);
for(const scenario of Object.values(c.scenarios)){checkCost(scenario.items);assert.ok(c.weather[scenario.weather]);}
console.log(`Content validated: ${Object.keys(c.items).length} items, ${Object.keys(c.recipes).length} recipes, ${Object.keys(c.locations).length} locations, ${ids.size} quests, ${catalog.length} generated assets, 16 foley clips; valid links, art, costs, and event fallbacks.`);
