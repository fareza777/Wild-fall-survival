import {button,esc,icon} from './helpers.js';
import {isNight} from '../game/survival.js';
const nav=tab=>`button[data-ui="tab"][data-tab="${tab}"]`;
export function progressGuide(state,kind,options={}){
  const t=state.tutorial;if(!t?.active)return;
  if(t.step===1&&kind==='gather')t.step=2;
  while((t.step===2&&state.camp.shelter)||(t.step===3&&state.camp.firepit)||(t.step===4&&state.camp.fire_cover)||(t.step===5&&state.camp.fire>0))t.step++;
  if(t.step===6&&kind==='use'){
    if(['water','tea'].includes(options.id))t.usedWater=true;
    if(['ration','berries','cooked_meat','cooked_fish','stew'].includes(options.id))t.usedFood=true;
    if(t.usedWater&&t.usedFood)t.step=7;
  }
  if(t.step===7&&kind==='explore'&&state.location==='forest')t.step=8;
}
export function guideStep(game,tab,modal){
  const s=game.state,t=s.tutorial;if(!t?.active)return null;
  const step=t.step;
  if(step>0&&step<8&&(s.stats.hydration<650||s.stats.calories<650)){
    const id=s.stats.hydration<650?'water':'ration';
    if(s.items[id])return {selector:tab==='pack'?`button[data-action="use"][data-id="${id}"]`:nav('pack'),title:'Supplies before effort.',text:'Your reserves are low. Use '+(id==='water'?'drinking water':'an emergency ration')+' from Pack before continuing.',item:id};
  }
  if(step===0)return {selector:'.hud',title:'Your reserves.',text:'Every action spends time, energy, food, and water. The clock waits for you.',next:true};
  if(step===1)return {selector:tab==='camp'?'button[data-action="gather"]':nav('camp'),title:'Find your first supplies.',text:'Tap Gather for wood, stone, and fiber. Read the result, then press Continue.'};
  if(step>=2&&step<=5){
    const id=({2:'shelter',3:'firepit',4:'fire_cover'})[step],recipe=id&&game.content.recipes[id];
    const needs=recipe?Object.entries(recipe.cost).filter(([id,n])=>(s.items[id]||0)<n):[['wood',2],...(s.camp.fire>0?[]:[['fiber',1]])].filter(([id,n])=>(s.items[id]||0)<n);
    const label=step===2?'A dry place to sleep.':step===3?'Build your fire ring.':step===4?'Rain needs a roof.':'Keep an ember alive.';
    if(s.stats.stamina<(recipe?.stamina||4)+3)return {selector:tab==='camp'?'button[data-action="rest"]':nav('camp'),title:'Catch your breath.',text:'Rest for one hour to recover energy. Your food and water still decrease.'};
    if(needs.length)return {selector:tab==='camp'?'button[data-action="gather"]':nav('camp'),title:label,text:'Gather '+needs.map(([id,n])=>`${n-(s.items[id]||0)} ${game.content.items[id].name.toLowerCase()}`).join(' · ')+'. Then build at camp.'};
    if(step===5)return {selector:modal==='fire-dialog'?'button[data-ui="perform"][data-kind="fire"]':tab==='camp'?'button[data-ui="fire-dialog"]':nav('camp'),title:label,text:'Add two wood and one fiber to light the fire. Your canopy protects it from rain.'};
    const text=step===2?'Build a shelter before night. A dry bed protects your body and improves sleep.':step===3?'A stone ring lets you light a fire and cook. Building the ring does not light it.':'Build an open-sided fire canopy. Your sleeping shelter does not cover the outdoor fire.';
    return {selector:modal==='craft-dialog'?`button[data-ui="perform"][data-id="${id}"]`:tab==='craft'?`button[data-action="craft"][data-id="${id}"]`:nav('craft'),title:label,text,recipe:id};
  }
  if(step===6)return {selector:tab==='pack'?`button[data-action="use"][data-id="${!t.usedWater?'water':'ration'}"]`:nav('pack'),title:!t.usedWater?'Drink safe water.':'Eat before the trail.',text:!t.usedWater?'Open Pack and use one drinking-water bottle. River water must be boiled first.':'Use an emergency ration from Pack. Food restores calories; water restores hydration.',item:!t.usedWater?'water':'ration'};
  if(step===7){
    const atForest=s.location==='forest';
    if(s.location==='camp'&&isNight(s))return {selector:modal==='action-dialog'?'button[data-ui="perform"][data-kind="sleep"]':modal?'button[data-ui="close-modal"]':tab==='camp'?'button[data-ui="action-dialog"][data-kind="sleep"]':nav('camp'),title:'Wait for daylight.',text:'Wildlife is more dangerous at night. Sleep in your dry camp, then leave after dawn.'};
    const required=game.effort(atForest?'explore':'travel',atForest?{}:{id:'forest'});
    if(s.stats.stamina<required)return {selector:modal?'button[data-ui="close-modal"]':tab==='camp'?'button[data-action="rest"],button[data-ui="perform"][data-kind="rest"]':nav('camp'),title:'Rest before the trail.',text:`You need ${Math.ceil(required)} energy for the next move. Close this sheet and rest for an hour.`};
    return {selector:atForest?tab==='camp'?'button[data-action="explore"]':nav('camp'):modal==='travel-dialog'?'button[data-ui="perform"][data-kind="travel"]':tab==='map'?'button[data-ui="travel-dialog"][data-id="forest"]':nav('map'),title:'Find a way home.',text:atForest?'Tap Explore to find a route to the river. Travel and searching are separate actions.':'Open Explore, choose Ashpine Forest, and travel. Prepare for wildlife away from camp.',map:true};
  }
  return {selector:nav('journal'),title:'Follow the rescue trail.',text:'Journal tracks the main story and side quests. Build a radio, then transmit from the summit. You are ready.',next:true,finish:true};
}
let current=null;
export function clearGuide(){document.getElementById('guide-root')?.remove();current?.classList.remove('guide-target');current=null;}
export function showGuide(game,tab,modal){
  clearGuide();const g=guideStep(game,tab,modal);if(!g)return;
  const targets=[...document.querySelectorAll(g.selector)],target=targets.find(el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0);
  if(!target)return;
  const rect=target.getBoundingClientRect(),root=document.createElement('div');root.id='guide-root';
  const width=Math.min(310,innerWidth-28),left=Math.max(14,Math.min(innerWidth-width-14,rect.left));
  const above=rect.bottom+190>innerHeight-16;
  root.innerHTML=`<div class="guide-ring" style="left:${rect.left-4}px;top:${rect.top-4}px;width:${rect.width+8}px;height:${rect.height+8}px"></div><aside class="guide-card" role="region" aria-label="Guided survival tutorial" style="width:${width}px;left:${left}px;${above?'bottom:'+Math.max(16,innerHeight-rect.top+13)+'px':'top:'+(rect.bottom+13)+'px'}"><div><span class="overline">FIRST STEPS · ${game.state.tutorial.step+1} / 9</span>${button('Skip','skip-guide',{},'guide-skip')}</div><h3>${esc(g.title)}</h3><p>${esc(g.text)}</p>${g.next?button(`${g.finish?'Ready':'Got it'} ${icon('arrow-right',18)}`,'guide-next',{},'primary-button'):''}</aside>`;
  document.body.append(root);current=target;target.classList.add('guide-target');
}
