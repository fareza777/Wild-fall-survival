import { readFile,writeFile } from 'node:fs/promises';
import { GameEngine } from '../web/game/engine.js';
import { capacity,weight } from '../web/game/inventory.js';
import { dayOf,hourOf,fireBurnRate } from '../web/game/survival.js';
import {requiredTools,repairCost} from '../web/game/tools.js';
import assert from 'node:assert/strict';
const c=Object.fromEntries(await Promise.all(['items','recipes','locations','weather','enemies','events','scenarios','quests'].map(async n=>[n,JSON.parse(await readFile(`web/data/${n}.json`,'utf8'))])));
const options={seed:Number(process.argv[4])||7103,difficulty:process.argv[2]||'story',scenario:process.argv[3]||'riverborn'};
const g=new GameEngine(c,null,options),s=g.state;
let steps=0,treating=false,feeding=false;
function perform(action,options={}){
  if(++steps>1800)throw new Error('Playthrough exceeded action budget');
  const result=g.perform(action,options);
  if(!result.ok)throw new Error(`${action} refused: ${result.message} at ${s.location} day ${dayOf(s)} ${hourOf(s)}h (${s.stats.stamina} stamina)`);
  if(s.dead)throw new Error(`Died after ${action}, day ${dayOf(s)}: ${JSON.stringify(s.stats)}`);
  pending();
  return result;
}
function pending(){
  while(s.event||s.combat||s.carcass){
    if(s.carcass){perform(g.reason('harvestCarcass',{part:'all'})?'leaveCarcass':'harvestCarcass',{part:'all'});continue;}
    if(s.event){const choice=c.events[s.event].choices.findIndex(x=>!x.stamina&&!x.cost);perform('resolveEvent',{choice});}
    else{
      const weapon=s.gear.find(x=>x.uid===s.equipment.weapon&&x.durability>0);
      if(s.stats.health<60&&s.items.bandage)perform('use',{id:'bandage'});
      else if((!weapon||weapon.durability<10||s.stats.health<70||s.combat.id==='bear')&&!g.reason('combat',{move:'flee'}))perform('combat',{move:'flee'});
      else perform('combat',{move:g.reason('combat',{move:'power'})?'defend':'power'});
    }
  }
}
function useSupplies(){
  for(let i=0;i<20;i++){
    if(s.stats.calories<1800){const id=['cooked_meat','cooked_fish','stew','ration','berries'].find(id=>s.items[id]);if(id){perform('use',{id});continue;}}
    if(s.stats.hydration<1750){const id=['water','tea'].find(id=>s.items[id]);if(id){perform('use',{id});continue;}}
    if(s.stats.hydration<650&&s.items.dirty_water){perform('use',{id:'dirty_water'});continue;}
    if(s.stats.injury>15&&s.items.bandage){perform('use',{id:'bandage'});continue;}
    if(s.stats.sickness>15&&s.items.medicine){perform('use',{id:'medicine'});continue;}
    if(s.stats.health<75&&s.items.bandage){perform('use',{id:'bandage'});continue;}
    break;
  }
}
function ready(action,options={}){
  pending();useSupplies();
  if(!feeding&&s.location==='camp'&&['travel','sleep'].includes(action)&&s.stats.calories<1300){feeding=true;try{campFood();}finally{feeding=false;}}
  if(action==='travel'&&s.location==='camp'&&(s.items.bandage||0)<2&&(s.items.fiber||0)>=4&&(s.items.herbs||0)>=1){craft('bandage');useSupplies();}
  if(!treating&&s.location==='camp'&&s.stats.sickness>12&&['gather','forage','rest','sleep','travel'].includes(action)){
    treating=true;try{craft('medicine');perform('use',{id:'medicine'});}finally{treating=false;}
  }
  if(action==='sleep'){
    const budget=g.preview('sleep',options);
    if(s.stats.calories<budget.calories+500)campFood();
    if(s.stats.hydration<budget.hydration+500)water();
    useSupplies();
  }
  if(s.stats.health<60&&s.location==='camp'&&action!=='rest'&&action!=='sleep'){
    for(let i=0;i<12&&s.stats.health<85&&s.stats.calories>1000&&s.stats.hydration>1000;i++){perform('rest');useSupplies();}
  }
  for(let i=0;i<8;i++){
    const reason=g.reason(action,options);if(!reason||s.stats.stamina + .001 >= g.effort(action,options))return;
    perform('rest');useSupplies();
  }
}
function act(action,options={}){const location=s.location;for(const id of requiredTools(s,c,action,options)){if(!s.gear.some(x=>x.id===id))craft(id);maintain(id);}if(s.location!==location)travel(location);ready(action,options);if(action==='craft'&&c.recipes[options.id]?.requiresFire&&s.camp.fire<c.recipes[options.id].minutes*fireBurnRate(s,c)){fire();ready(action,options);}return perform(action,options);}
function travel(id){if(s.location!==id)act('travel',{id});}
function trim(protectedItems=[]){
  for(const [id,n] of Object.entries(s.items)){
    const keep={wood:6,stone:4,fiber:12,herbs:5,berries:8,mushroom:2,scrap:8,ore:5,hide:5}[id];
    if(keep!==undefined&&n>keep&&!protectedItems.includes(id))perform('drop',{id,quantity:n-keep});
  }
}
function campFood(){
  travel('camp');
  if(s.stats.hydration<1100&&!s.items.water)water();
  for(let tries=0;tries<30&&(s.items.berries||0)<5&&s.stats.calories<2200;tries++){
    trim(['berries']);makeRoom(0.8,['berries']);act('forage');
    while(s.items.berries&&s.stats.calories<2200)perform('use',{id:'berries'});
    useSupplies();
    if(s.stats.hydration<1000&&!s.items.water)water();
  }
  if(s.items.raw_meat){fire();while(s.items.raw_meat){act('craft',{id:'cooked_meat'});useSupplies();}}
}
function fire(){travel('camp');if(!s.camp.firepit)craft('firepit');if(!s.camp.fire_cover)craft('fire_cover');while(s.camp.fire<400){materials({wood:2,fiber:s.camp.fire>0?0:1});act('fire');}}
function water(){
  if((s.items.water||0)>=3)return;
  fire();travel('river');trim(['dirty_water']);makeRoom(3.6,['dirty_water']);act('water');act('water');act('water');travel('camp');
  while((s.items.dirty_water||0)>=2){act('craft',{id:'water'});useSupplies();}
}
function makeRoom(kg,protectedItems=[]){
  for(let i=0;i<80&&weight(s,c)>capacity(s)-kg;i++){
    const id=['stone','wood','scrap','mushroom','herbs','fiber'].find(id=>s.items[id]&&!protectedItems.includes(id));
    if(!id)break;perform('drop',{id});
  }
}
function materials(cost){
  const needed=Object.keys(cost);
  for(let tries=0;tries<160;tries++){
    trim(needed);useSupplies();
    const missing=Object.entries(cost).find(([id,n])=>(s.items[id]||0)<n);
    if(!missing)return;
    const id=missing[0];
    if(['wood','stone','fiber'].includes(id)){travel('camp');act('gather');}
    else if(id==='scrap'){travel('cabin');act('gather');}
    else if(id==='hide'){travel('forest');act('hunt');}
    else if(id==='ore'){travel('cave');const torch=s.gear.find(x=>x.id==='torch'&&x.durability>0);act('equip',{uid:torch.uid});if(s.equipment.tool!==torch.uid)act('equip',{uid:torch.uid});act('mine');}
    else if(id==='herbs'){travel('camp');act('forage');}
    else if(id==='water')water();
    else throw new Error('Unknown sourcing step '+id);
    if(s.stats.calories<600&&!s.items.ration&&!s.items.berries){travel('camp');act('forage');}
    if(weight(s,c)>capacity(s)-.1){
      const expendable=Object.entries(s.items).find(([key,n])=>!needed.includes(key)&&c.items[key].category==='resource'&&!['backpack'].includes(key)&&n>1);
      if(expendable)perform('drop',{id:expendable[0],quantity:expendable[1]});
    }
  }
  throw new Error('Materials could not be obtained: '+JSON.stringify(cost)+' '+JSON.stringify(s.items));
}
function craft(id){
  const r=c.recipes[id];
  for(const tool of r.tools||[]){if(!s.gear.some(x=>x.id===tool))craft(tool);maintain(tool);}
  if(r.requiresFire)fire();
  materials(r.cost);travel('camp');
  act('craft',{id});
}
function equip(id){const gear=s.gear.find(x=>x.id===id&&x.durability>0);if(s.equipment[c.items[id].slot]!==gear?.uid)act('equip',{uid:gear.uid});}
function maintain(id){const gear=s.gear.find(x=>x.id===id);if(gear&&gear.durability<30){materials(repairCost(c,id));travel('camp');act('repair',{uid:gear.uid});}}
function expeditionFood(){
  for(let i=0;i<25&&(s.items.cooked_meat||0)<4;i++){
    trim();makeRoom(1);if(!s.items.water)water();maintain('spear');equip('spear');travel('forest');act('hunt');travel('camp');fire();
    while(s.items.raw_meat){act('craft',{id:'cooked_meat'});useSupplies();}
    if(s.stats.hydration<1200&&!s.items.water)water();
  }
  water();maintain('axe');maintain('spear');
}
craft('axe');equip('axe');craft('firepit');craft('shelter');fire();craft('spear');equip('spear');
act('sleep',{hours:8});useSupplies();
travel('forest');act('explore');travel('river');act('explore');act('water');travel('cabin');act('explore');act('gather');
water();campFood();
craft('jacket');equip('jacket');campFood();water();craft('backpack');
if(s.difficulty!=='story'){craft('insulated');equip('insulated');campFood();water();}
craft('torch');travel('ruins');act('explore');act('gather');campFood();water();fire();maintain('axe');maintain('spear');act('sleep',{hours:6});expeditionFood();
travel('mountain');act('explore');act('explore');travel('cave');equip('torch');act('explore');act('mine');act('mine');
travel('camp');water();campFood();fire();craft('battery');craft('radio');
useSupplies();fire();act('sleep',{hours:6});campFood();water();travel('summit');
for(let i=0;i<36&&g.reason('signal');i++){act('rest');useSupplies();}
act('signal');
assert.equal(s.flags.rescued,true);assert.equal(s.quests.completed.filter(id=>c.quests.main.some(q=>q.id===id)).length,5);
const report={passed:true,difficulty:s.difficulty,scenario:s.scenario,seed:options.seed,days:dayOf(s),actions:steps,quests:s.quests.completed,health:s.stats.health,stats:s.stats,notes:'All resources obtained using public actions; no state injection, free resources, or stat resets.'};
await writeFile(`test-results/playthrough-${s.difficulty}-report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
