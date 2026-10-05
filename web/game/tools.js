export const STARTER_KIT=['knife'];
export const workingTool=(state,id)=>state.gear.find(gear=>gear.id===id&&gear.durability>0);
export const repairCost=(content,id)=>content.items[id]?.repair||{scrap:1,fiber:2};
export function requiredTools(state,content,action,options={}){
 if(action==='craft')return content.recipes[options.id]?.tools||[];
 if(action==='mine')return ['pickaxe'];
 if(action==='water')return ['canteen'];
 if(action==='fire'&&state.camp.fire<=0)return ['fire_drill'];
 return [];
}
export function wearTool(state,id,amount){
 const gear=workingTool(state,id);if(!gear)return false;
 gear.uses=(gear.uses||0)+amount;
 gear.durability=Math.max(0,gear.durability-amount);
 if(!gear.durability)for(const slot of Object.keys(state.equipment))if(state.equipment[slot]===gear.uid)state.equipment[slot]=null;
 return !gear.durability;
}
export function migrateTools(state,content){
 if(state.toolsVersion===2)return [];
 const removed=[],ids=['cooking_pot','canteen','fire_drill'];
 if(state.toolsVersion===1){
  const initial=state.logs.some(log=>log.id===0),upgrade=state.logs.find(log=>log.text==='Your salvaged cooking pot, canteen and fire drill are now listed in Gear.');
  const after=state.logs.filter(log=>log.id>=(upgrade?.id||0));
  // v1.4 did not record origins. Withdraw only gifts whose complete history proves no use/repair.
  if((initial||upgrade)&&!after.some(log=>log.text.startsWith('Equipment repaired:'))){
   for(const [index,id] of ids.entries()){
    const candidates=state.gear.filter(gear=>gear.id===id&&gear.origin!=='crafted'&&!(gear.uses>0)&&gear.durability===content.items[id].durability&&
     (upgrade?!after.some(log=>log.text===`Completed: ${content.items[id].name.toLowerCase()}.`):gear.uid===`${id}-${index+2}`));
    for(const gear of candidates){state.gear=state.gear.filter(x=>x.uid!==gear.uid);removed.push(id);for(const slot of Object.keys(state.equipment))if(state.equipment[slot]===gear.uid)state.equipment[slot]=null;}
   }
  }
 }
 state.toolsVersion=2;return removed;
}
