import {button,esc,icon} from './helpers.js';
import {isNight,exertionCost} from '../game/survival.js';
import {fireBurnRate} from '../game/survival.js';
import {weight,capacity} from '../game/inventory.js';
import {workingTool,requiredTools} from '../game/tools.js';
const nav=tab=>`button[data-ui="tab"][data-tab="${tab}"]`;
const safeDrink=item=>item?.hydration>0&&!item.risk&&['water','medicine'].includes(item.category);
const safeFood=item=>item?.calories>0&&!item.risk&&item.category==='food';
function supply(game,drink){
  const order=drink?['water','tea']:['ration','cooked_meat','cooked_fish','stew','berries'];
  return Object.keys(game.state.items).filter(id=>game.state.items[id]>0&&(drink?safeDrink:safeFood)(game.content.items[id])).sort((a,b)=>(order.includes(a)?order.indexOf(a):99)-(order.includes(b)?order.indexOf(b):99))[0];
}
export function reconcileGuide(state,content){
 const t=state.tutorial;if(!t?.active)return false;const before=JSON.stringify(t);
 const interrupted=!state.dead&&!!(state.combat||state.event);
 if(interrupted){
  state.combat=null;state.event=null;
  state.logs.unshift({id:state.nextLog++,time:state.time,text:'The trail settles while you finish your first steps.',tone:'story'});
  state.logs=state.logs.slice(0,80);
 }
 if(t.version!==2){
  // v1.2 recorded early drinks in history, but forgot their tutorial flags.
  for(const [id,item] of Object.entries(content.items))if(state.logs.some(log=>log.text.startsWith(`Used ${item.name.toLowerCase()}.`))){if(safeDrink(item))t.usedWater=true;if(safeFood(item))t.usedFood=true;}
  t.version=2;
 }
 if(t.step===6&&t.usedWater&&t.usedFood)t.step=7;
 return interrupted||before!==JSON.stringify(t);
}
export function progressGuide(state,kind,options={},content){
  const t=state.tutorial;if(!t?.active)return;
  if(kind==='use'){
    const item=content?.items[options.id];
    if(item?safeDrink(item):['water','tea'].includes(options.id))t.usedWater=true;
    if(item?safeFood(item):['ration','berries','cooked_meat','cooked_fish','stew'].includes(options.id))t.usedFood=true;
  }
  if(t.step===1&&kind==='gather')t.step=2;
  while((t.step===2&&state.camp.shelter)||(t.step===3&&state.camp.firepit)||(t.step===4&&state.camp.fire_cover)||(t.step===5&&state.camp.fire>0))t.step++;
  if(t.step===6&&t.usedWater&&t.usedFood)t.step=7;
  if(t.step===7&&kind==='explore'&&state.location==='forest')t.step=8;
}
function restHint(tab,modal){return {selector:modal?'button[data-ui="close-modal"]':tab==='camp'?'button[data-action="rest"],button[data-ui="perform"][data-kind="rest"]':nav('camp'),title:'Catch your breath.',text:'Rest for one hour to recover energy. Food and water still decrease.',action:'rest'};}
function guidedAction(game,tab,modal,action,title,text,options={}){
 if(game.state.stats.stamina<game.effort(action,options))return restHint(tab,modal);
 return {selector:modal==='action-dialog'?`button[data-ui="perform"][data-kind="${action}"]`:tab==='camp'?`button[data-action="${action}"],button[data-ui="action-dialog"][data-kind="${action}"]`:nav('camp'),title,text,action};
}
function travelHint(game,tab,modal,id,title,text){
 const forecast=game.preview('travel',{id});
 const nextAction=id==='forest'?'explore':id==='river'?'water':null;
 const nextEffort=nextAction&&forecast?exertionCost({...game.state,weather:forecast.weather,stats:forecast.stats},game.content,game.actionCost(nextAction).stamina):0;
 if(forecast&&forecast.stats.stamina<Math.max(30,nextEffort+15))return {...restHint(tab,modal),title:'Rest before the trail.',text:'Recover energy before travelling. Keep enough for the next action.'};
 return {selector:modal==='travel-dialog'?`button[data-ui="perform"][data-kind="travel"][data-id="${id}"]`:tab==='map'?`button[data-ui="travel-dialog"][data-id="${id}"]`:nav('map'),title,text,map:true,location:id};
}
function roomHint(game,tab,modal,needed={},space=2.4){
 const s=game.state,c=game.content;if(capacity(s)-weight(s,c)>=space)return null;
 const id=Object.keys(s.items).filter(id=>c.items[id].category==='resource'&&s.items[id]>(needed[id]||0)).sort((a,b)=>(s.items[b]-(needed[b]||0))*c.items[b].weight-(s.items[a]-(needed[a]||0))*c.items[a].weight)[0];
 if(!id)return null;
 return {selector:modal==='item-info'?`button[data-ui="perform"][data-kind="drop"][data-id="${id}"]`:tab==='pack'?`button[data-ui="item-info"][data-id="${id}"]`:nav('pack'),title:'Make room for supplies.',text:`Drop one surplus ${c.items[id].name.toLowerCase()} from its details. Keep the materials needed for your next build.`,item:id,drop:true};
}
function buildHint(game,tab,modal,id,title,text){
 const s=game.state,r=game.content.recipes[id];
 if(s.location!=='camp')return travelHint(game,tab,modal,'camp','Return to your workshop.','Craft and build at camp.');
 const missing=requiredTools(s,game.content,'craft',{id}).find(tool=>!workingTool(s,tool));
 if(missing)return buildHint(game,tab,modal,missing,'Prepare your kit.','Craft '+game.content.items[missing].name.toLowerCase()+' before this recipe.');
 const prepared=r.cost;
 const needs=Object.entries(prepared).filter(([id,n])=>(s.items[id]||0)<n);
 if(needs.length)return roomHint(game,tab,modal,prepared)||guidedAction(game,tab,modal,'gather',title,'Gather '+needs.map(([id,n])=>`${n-(s.items[id]||0)} ${game.content.items[id].name.toLowerCase()}`).join(' · ')+(id==='fire_cover'?'. Keep fuel ready to light the fire after building.':'.'));
 if(s.stats.stamina<game.effort('craft',{id}))return restHint(tab,modal);
 return {selector:modal==='craft-dialog'?`button[data-ui="perform"][data-id="${id}"]`:tab==='craft'?`button[data-action="craft"][data-id="${id}"]`:nav('craft'),title,text,recipe:id};
}
function fireHint(game,tab,modal){
 const s=game.state;
 if(s.location!=='camp')return travelHint(game,tab,modal,'camp','Return to your camp.','Your fire and workshop are at camp.');
 if(!s.camp.firepit)return buildHint(game,tab,modal,'firepit','Build your fire ring.','A stone ring lets you light a fire and cook.');
 if(!s.camp.fire_cover)return buildHint(game,tab,modal,'fire_cover','Rain needs a roof.','Build an open-sided canopy to keep your fire dry.');
 if(s.camp.fire<=0&&!workingTool(s,'fire_drill'))return buildHint(game,tab,modal,'fire_drill','Make a fire drill.','Twist dry cordage around a wooden spindle before lighting a cold fire.');
 const needed={wood:2,...(s.camp.fire>0?{}:{fiber:1})};
 if(Object.entries(needed).some(([id,n])=>(s.items[id]||0)<n))return roomHint(game,tab,modal,needed)||guidedAction(game,tab,modal,'gather','Fuel for warmth.','Gather wood and fiber before lighting the fire.');
 if(s.stats.stamina<game.effort('fire'))return restHint(tab,modal);
 return {selector:modal==='fire-dialog'?'button[data-ui="perform"][data-kind="fire"]':tab==='camp'?'button[data-ui="fire-dialog"]':nav('camp'),title:'Keep an ember alive.',text:s.camp.fire>0?'Add wood so the fire lasts through cooking.':'Add two wood and one fiber. Your canopy keeps the fire dry.',action:'fire'};
}
function waterHint(game,tab,modal){
 const s=game.state,r=game.content.recipes.water;
 if(s.location==='river'&&(s.items.dirty_water||0)<6)return roomHint(game,tab,modal,{dirty_water:6},1.2)||guidedAction(game,tab,modal,'water','Carry enough for the return.','Collect at least six river-water bottles. Boil them at camp; the return trip also consumes water.');
 if((s.items.dirty_water||0)>=r.cost.dirty_water){
  if(s.location!=='camp')return travelHint(game,tab,modal,'camp','Bring water back to camp.','River water needs boiling before it is safe.');
  if(!workingTool(s,'cooking_pot'))return buildHint(game,tab,modal,'cooking_pot','Carry a cooking pot.','A metal pot makes river water safe. Craft one in Tools before boiling.');
  if(s.camp.fire<r.minutes*fireBurnRate(s,game.content)||!s.camp.fire_cover)return fireHint(game,tab,modal);
  if(s.stats.stamina<game.effort('craft',{id:'water'}))return restHint(tab,modal);
  return {selector:modal==='craft-dialog'?'button[data-ui="perform"][data-id="water"]':tab==='craft'?'button[data-action="craft"][data-id="water"]':nav('craft'),title:'Make water safe.',text:'Your carried pot is ready. Boil water in Cooking, then drink from Pack.',recipe:'water'};
 }
 if(s.location==='river')return roomHint(game,tab,modal,{dirty_water:2},1.2)||guidedAction(game,tab,modal,'water','Refill at the river.','Collect river water. Carry it back to camp and boil it.');
 if(game.unlocked('river'))return travelHint(game,tab,modal,'river','Find a water source.','Your bottles are empty. Travel to the river to refill, then boil water at camp.');
 if(s.location!=='forest')return travelHint(game,tab,modal,'forest','Follow the water trail.','Travel to Ashpine Forest, then explore to open the river route.');
 return guidedAction(game,tab,modal,'explore','Find the river.','Explore the forest to open a route to fresh water.');
}
function supplyHint(game,tab,modal,drink){
 const id=supply(game,drink);
 if(id)return {selector:tab==='pack'?`button[data-action="use"][data-id="${id}"]`:nav('pack'),title:drink?'Drink safe water.':'Eat before the trail.',text:`Use ${game.content.items[id].name.toLowerCase()} from Pack. ${drink?'Safe drinks restore hydration.':'Food restores calories.'}`,item:id};
 if(drink)return waterHint(game,tab,modal);
 const s=game.state,raw=['cooked_meat','cooked_fish'].find(id=>(s.items[Object.keys(game.content.recipes[id].cost)[0]]||0)>0);
 if(raw&&s.location==='camp'){const missing=requiredTools(s,game.content,'craft',{id:raw}).find(id=>!workingTool(s,id));if(missing)return buildHint(game,tab,modal,missing,'Prepare to roast.','Craft your reusable roasting spit in Tools.');if(s.camp.fire<game.content.recipes[raw].minutes*fireBurnRate(s,game.content)||!s.camp.fire_cover)return fireHint(game,tab,modal);if(s.stats.stamina<game.effort('craft',{id:raw}))return restHint(tab,modal);return {selector:modal==='craft-dialog'?`button[data-ui="perform"][data-id="${raw}"]`:tab==='craft'?`button[data-action="craft"][data-id="${raw}"]`:nav('craft'),title:'Cook before eating.',text:'Cook your raw catch at camp. Then eat it from Pack.',recipe:raw};}
 if(!game.content.locations[s.location].actions.includes('forage'))return travelHint(game,tab,modal,'camp','Find safe food.','Return to camp to forage for berries.');
 return roomHint(game,tab,modal,{},1)||guidedAction(game,tab,modal,'forage','Find your next meal.','Forage for edible berries, then eat them from Pack. Finds vary each time.');
}
export function guideStep(game,tab,modal){
  const s=game.state,t=s.tutorial;if(!t?.active)return null;
  const step=t.step;
  // Finishing a ready, short ignition creates the cooking source we need.
  // Do not postpone it indefinitely to forage while safe supplies are empty.
  if(step===5&&!supply(game,true)&&!supply(game,false)&&(s.stats.hydration>=150||!s.items.dirty_water))return fireHint(game,tab,modal);
  const readyBuild=({2:'shelter',3:'firepit',4:'fire_cover'})[step];
  if(readyBuild&&!supply(game,true)&&!supply(game,false)&&!game.reason('craft',{id:readyBuild})&&!game.preview('craft',{id:readyBuild}).dead)return buildHint(game,tab,modal,readyBuild,'Finish your dry camp.','Build this prepared structure, then light the fire for warmth and safe cooking.');
  if(step>0&&step<8){
    // An empty bottle needs a return trip and cooking, not just a quick sip.
    const waterReserve=step===7?500:supply(game,true)?650:1000,foodReserve=step===7?500:650;
    const needsWater=s.stats.hydration<waterReserve,needsFood=s.stats.calories<foodReserve;
    if(s.stats.hydration<150&&!supply(game,true)&&s.items.dirty_water){if(!game.reason('craft',{id:'water'}))return waterHint(game,tab,modal);return {selector:tab==='pack'?'button[data-action="use"][data-id="dirty_water"]':nav('pack'),title:'A last resort.',text:'Severe dehydration: drink river water only as an emergency. It risks sickness. Boil your next bottle.',item:'dirty_water'};}
    if(s.stats.sickness>=25){
      const medicine=Object.keys(s.items).find(id=>s.items[id]>0&&game.content.items[id].sickness<0&&!game.content.items[id].risk);
      if(medicine)return {selector:tab==='pack'?`button[data-action="use"][data-id="${medicine}"]`:nav('pack'),title:'Treat sickness.',text:`Use ${game.content.items[medicine].name.toLowerCase()} from Pack. Sickness makes every action harder.`,item:medicine};
      if(s.location==='camp'&&s.items.herbs>=2){
        if(s.items.water&&!game.reason('craft',{id:'tea'}))return {selector:tab==='craft'?'button[data-action="craft"][data-id="tea"]':nav('craft'),title:'Brew a remedy.',text:'Make herbal tea in Remedies, then use it from Pack.',recipe:'tea'};
        if(!needsWater&&s.camp.fire<game.content.recipes.tea.minutes*fireBurnRate(s,game.content)&&s.camp.fire_cover&&s.items.wood>=2&&s.items.fiber)return fireHint(game,tab,modal);
      }
    }
    if(needsFood&&(supply(game,false)||!needsWater||s.stats.hydration>750||(s.stats.calories<400&&s.stats.hydration>300)))return supplyHint(game,tab,modal,false);
    if(needsWater)return supplyHint(game,tab,modal,true);
    if(needsFood)return supplyHint(game,tab,modal,false);
  }
  if(step===0)return {selector:'.hud',title:'Your reserves.',text:'Gentle needs. Quiet trails. Every action costs time and energy. Your chosen difficulty begins after the guide.',next:true};
  if(step===1)return guidedAction(game,tab,modal,'gather','Find your first supplies.','Tap Gather for wood, stone, and fiber. Read the result, then press Continue.');
  if(step>=2&&step<=5){
    const id=({2:'shelter',3:'firepit',4:'fire_cover'})[step];
    const label=step===2?'A dry place to sleep.':step===3?'Build your fire ring.':step===4?'Rain needs a roof.':'Keep an ember alive.';
    if(step===5)return fireHint(game,tab,modal);
    const text=step===2?'Build a shelter before night. A dry bed protects your body and improves sleep.':step===3?'A stone ring lets you light a fire and cook. Building the ring does not light it.':'Build an open-sided fire canopy. Your sleeping shelter does not cover the outdoor fire.';
    return buildHint(game,tab,modal,id,label,text);
  }
  if(step===6)return supplyHint(game,tab,modal,!t.usedWater);
  if(step===7){
    const atForest=s.location==='forest';
    if(s.location==='camp'&&isNight(s)){
      const night=game.preview('sleep');
      if(s.stats.hydration<night.hydration+400)return supplyHint(game,tab,modal,true);
      if(s.stats.calories<night.calories+400)return supplyHint(game,tab,modal,false);
      return guidedAction(game,tab,modal,'sleep','Wait for daylight.','Sleep in your dry camp, then leave after dawn. Food and water still decrease.');
    }
    return atForest?guidedAction(game,tab,modal,'explore','Find a way home.','Explore to uncover routes and clues. The trail stays quiet during your first steps.'):travelHint(game,tab,modal,'forest','Find a way home.','Choose Ashpine Forest and travel. Wildlife stays away while you learn.');
  }
  if(s.stats.stamina<40){
    const rest=game.preview('rest');
    if(s.stats.hydration<rest.hydration+400)return supplyHint(game,tab,modal,true);
    if(s.stats.calories<rest.calories+500)return supplyHint(game,tab,modal,false);
    return {...restHint(tab,modal),title:'Ready for the wilderness.',text:'Rest before finishing the guide. Begin your next chapter with energy to spare.'};
  }
  return {selector:nav('journal'),title:'Your next chapter.',text:'Open Journal for your objective. Finish the guide to begin normal wilderness encounters.',next:true,finish:true};
}
let current=null;
export function clearGuide(){document.getElementById('guide-root')?.remove();current?.classList.remove('guide-target');current=null;}
export function showGuide(game,tab,modal){
  clearGuide();const g=guideStep(game,tab,modal);if(!g)return;
  const targets=[...document.querySelectorAll(g.selector)];let target=targets.find(el=>!el.disabled&&!el.closest('[inert]')&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
  if(!target&&modal){target=document.querySelector('button[data-ui="close-modal"]');if(target)g.text='Close this sheet, then follow the highlighted step.';}
  if(!target)return;
  const rect=target.getBoundingClientRect(),root=document.createElement('div');root.id='guide-root';
  const width=Math.min(310,innerWidth-28),left=Math.max(14,Math.min(innerWidth-width-14,rect.left));
  const above=rect.bottom+190>innerHeight-16;
  root.innerHTML=`<div class="guide-ring" style="left:${rect.left-4}px;top:${rect.top-4}px;width:${rect.width+8}px;height:${rect.height+8}px"></div><aside class="guide-card" role="region" aria-label="Guided survival tutorial" style="width:${width}px;left:${left}px;${above?'bottom:'+Math.max(16,innerHeight-rect.top+13)+'px':'top:'+(rect.bottom+13)+'px'}"><div><span class="overline">FIRST STEPS · ${game.state.tutorial.step+1} / 9</span>${button('Skip','skip-guide',{},'guide-skip')}</div><h3>${esc(g.title)}</h3><p>${esc(g.text)}</p>${g.next?button(`${g.finish?'Ready':'Got it'} ${icon('arrow-right',18)}`,'guide-next',{},'primary-button'):''}</aside>`;
  document.body.append(root);current=target;target.classList.add('guide-target');
}
