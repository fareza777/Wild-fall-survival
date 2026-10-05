export const STARTER_KIT=['knife','cooking_pot','canteen','fire_drill'];
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
 gear.durability=Math.max(0,gear.durability-amount);
 if(!gear.durability)for(const slot of Object.keys(state.equipment))if(state.equipment[slot]===gear.uid)state.equipment[slot]=null;
 return !gear.durability;
}
export function migrateTools(state,content){
 if(state.toolsVersion===1)return false;
 for(const id of STARTER_KIT.slice(1))if(content.items[id]&&!state.gear.some(g=>g.id===id))state.gear.push({id,uid:`${id}-${state.nextGear++}`,durability:content.items[id].durability});
 state.toolsVersion=1;return true;
}
