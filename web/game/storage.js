import { createState } from './engine.js';

const KEY='wildfall-save-v1', PREF='wildfall-preferences-v1', RECORD='wildfall-records-v1';
export const defaultSettings={sound:true,ambient:true,sfxVolume:.65,ambientVolume:.32,vibration:true,motion:true,largeText:false};
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function validState(state,content) {
  if(!isObject(state)||state.version!==1||!content.locations[state.location]||!content.weather[state.weather])return false;
  if(!Number.isFinite(state.time)||state.time<0||!Number.isFinite(state.startTime)||state.time<state.startTime||!Number.isFinite(state.seed)||state.seed<=0)return false;
  if(!isObject(state.stats)||!isObject(state.items)||!isObject(state.camp)||!isObject(state.flags)||!isObject(state.equipment)||!isObject(state.counters)||!isObject(state.skills))return false;
  if(!Array.isArray(state.gear)||!Array.isArray(state.visited)||!Array.isArray(state.discovered)||!Array.isArray(state.logs)||!Array.isArray(state.traps)||!Array.isArray(state.quests?.completed))return false;
  if(!Object.keys(createState(content).stats).every(k=>Number.isFinite(state.stats[k])))return false;
  if(typeof state.dead!=='boolean'||typeof state.permadeath!=='boolean'||!['story','survivor','relentless'].includes(state.difficulty))return false;
  if(!Number.isInteger(state.camp.shelter)||state.camp.shelter<0||state.camp.shelter>3||!Number.isFinite(state.camp.fire)||state.camp.fire<0||state.camp.fire>960)return false;
  if(['firepit','garden','rain_collector'].some(key=>typeof state.camp[key]!=='boolean'))return false;
  if(state.camp.fire_cover!==undefined&&typeof state.camp.fire_cover!=='boolean')return false;
  if(state.prologue!=null&&(!isObject(state.prologue)||!Number.isInteger(state.prologue.step)||state.prologue.step<0||state.prologue.step>4||typeof state.prologue.complete!=='boolean'))return false;
  if(state.tutorial!=null&&(!isObject(state.tutorial)||!Number.isInteger(state.tutorial.step)||state.tutorial.step<0||state.tutorial.step>8||typeof state.tutorial.active!=='boolean'))return false;
  if(state.carcass!=null){const x=state.carcass;if(!isObject(x)||!content.enemies[x.id]||x.location!==state.location||!Number.isFinite(x.time)||x.time>state.time||!Number.isFinite(x.expires)||x.expires<x.time||!isObject(x.loot)||!Object.keys(x.loot).length||Object.entries(x.loot).some(([id,n])=>!['raw_meat','hide'].includes(id)||!Number.isInteger(n)||n<1||n>content.enemies[x.id].harvest.yields[id][1]))return false;}
  if(state.receipt!=null){const r=state.receipt;if(!isObject(r)||typeof r.kind!=='string'||typeof r.message!=='string'||!isObject(r.options)||!Array.isArray(r.notes)||r.notes.some(n=>typeof n!=='string')||!Array.isArray(r.quests)||!isObject(r.effects)||!Number.isFinite(r.effects.minutes)||r.effects.minutes<0||!isObject(r.effects.stats)||Object.values(r.effects.stats).some(n=>!Number.isFinite(n)))return false;for(const map of [r.effects.gained,r.effects.left])if(!isObject(map)||Object.entries(map).some(([id,n])=>!content.items[id]||!Number.isInteger(n)||n<0))return false;}
  for(const key of ['health','stamina','fatigue','injury','sickness'])if(state.stats[key]<0||state.stats[key]>100)return false;
  if(state.stats.calories<0||state.stats.calories>2800||state.stats.hydration<0||state.stats.hydration>2500||state.stats.temperature<31||state.stats.temperature>40)return false;
  if(Object.entries(state.items).some(([id,n])=>!content.items[id]||!Number.isInteger(n)||n<0))return false;
  if(state.gear.some(g=>!content.items[g.id]||content.items[g.id].category!=='gear'||typeof g.uid!=='string'||!Number.isFinite(g.durability)||g.durability<0||g.durability>content.items[g.id].durability))return false;
  if(new Set(state.gear.map(g=>g.uid)).size!==state.gear.length)return false;
  if(['tool','weapon','clothing'].some(slot=>state.equipment[slot]!==null&&!state.gear.some(g=>g.uid===state.equipment[slot]&&content.items[g.id].slot===slot&&g.durability>0)))return false;
  const shape=createState(content);
  if(Object.keys(shape.counters).some(k=>!Number.isFinite(state.counters[k])||state.counters[k]<0)||Object.keys(shape.skills).some(k=>!Number.isFinite(state.skills[k])||state.skills[k]<0))return false;
  if(state.discovered.some(id=>!content.locations[id])||state.visited.some(id=>!content.locations[id]))return false;
  if(state.traps.some(t=>!content.locations[t.location]||!Number.isFinite(t.time)||t.time<0||t.time>state.time))return false;
  if(state.event!==null&&!content.events[state.event])return false;
  if(state.combat!==null&&(!content.enemies[state.combat?.id]||!Number.isFinite(state.combat?.health)||!Number.isFinite(state.combat?.maxHealth)||state.combat.maxHealth<=0||!Array.isArray(state.combat.messages)))return false;
  return Number.isInteger(state.nextGear)&&Number.isInteger(state.nextLog)&&Number.isFinite(state.nextWeather)&&isObject(state.explored);
}
export function parseSave(raw,content) {
  try {
    const save=JSON.parse(raw);
    if(!validState(save?.state,content))return null;
    if(save.state.permadeath&&save.state.dead)save.checkpoint=null;
    else if(save.checkpoint&&!validState(save.checkpoint,content))save.checkpoint=null;
    return save;
  } catch{return null;}
}
function get(key){try{return localStorage.getItem(key);}catch{return null;}}
function put(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function loadSave(content) {
  const local=parseSave(get(KEY),content);
  let native=null;
  if(globalThis.Android?.loadBackup){try{native=parseSave(Android.loadBackup(),content);}catch{}}
  // WebView may not flush its disk copy before force-stop. Prefer the newest valid copy.
  const stamp=save=>Number.isFinite(save?.savedAt)?save.savedAt:0;
  return native&&(!local||stamp(native)>stamp(local))?native:local;
}
export function saveRun(state,checkpoint) {
  const data={state,checkpoint:state.permadeath&&state.dead?null:checkpoint,savedAt:Date.now()};
  const saved=put(KEY,data);
  let nativeSaved=false;
  if(globalThis.Android?.saveBackup){try{Android.saveBackup(JSON.stringify(data));nativeSaved=true;}catch{}}
  return saved||nativeSaved;
}
export function readSettings(){try{return {...defaultSettings,...JSON.parse(get(PREF)||'{}')};}catch{return {...defaultSettings};}}
export function saveSettings(value){put(PREF,value);}
export function readRecords(){try{return {bestMinutes:0,runs:0,rescues:0,rating:0,...JSON.parse(get(RECORD)||'{}')};}catch{return {bestMinutes:0,runs:0,rescues:0,rating:0};}}
export function saveRecords(value){put(RECORD,value);}
export function clearSave(){try{localStorage.removeItem(KEY);globalThis.Android?.saveBackup('');}catch{}}
