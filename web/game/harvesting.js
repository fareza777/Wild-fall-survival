import { equipped } from './inventory.js';
import { random, range } from './random.js';
import { isNight } from './survival.js';

export function gatherYield(state,content,action,location) {
  const table=action==='forage'?location.forage:location.loot;
  const roll=random(state),quality=roll<.2?'Sparse':roll>.83?'Rich':'Steady';
  const abundance=quality==='Sparse'?.5:quality==='Rich'?1.55:1;
  const conditions=(isNight(state)?.78:1)*(content.weather[state.weather].wet?.88:1)*(state.stats.fatigue>75?.85:1);
  const found={};
  for(const [id,limits] of Object.entries(table||{})) {
    if(action==='forage'&&random(state)<(quality==='Sparse'?.4:.12))continue;
    const base=range(state,limits[0],Math.max(limits[1],limits[0]+1));
    const amount=base*abundance*conditions;
    let n=Math.floor(amount)+(random(state)<amount%1?1:0);
    if(id==='wood'&&action==='gather')n+=equipped(state,content,'tool')?.gather||0;
    if(n>0)found[id]=n;
  }
  return {found,quality};
}
export const cuttingTool=(state)=>state.gear.find(g=>['knife','axe','iron_axe'].includes(g.id)&&g.durability>0);
export function carcassCost(carcass,content,part) {
  if(!carcass||!['all','meat','hide'].includes(part))return null;
  const ids=part==='all'?Object.keys(carcass.loot):[part==='meat'?'raw_meat':'hide'];
  if(!ids.some(id=>carcass.loot[id]>0))return null;
  const share=ids.reduce((n,id)=>n+(id==='raw_meat'?.6:.4),0);
  const profile=content.enemies[carcass.id].harvest;
  return {minutes:Math.ceil(profile.minutes*share),stamina:Math.ceil(profile.stamina*share),ids};
}
