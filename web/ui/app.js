import { GameEngine } from '../game/engine.js';
import { loadSave, saveRun, readSettings, saveSettings, readRecords, saveRecords } from '../game/storage.js';
import { dayOf, clockText, ambient, fireBurnRate } from '../game/survival.js';
import { equipped, weight, capacity } from '../game/inventory.js';
import { icon, art, itemArt, esc, button, actionButton, duration, survived, costMarkup } from './helpers.js';
import { shell, campView, ACTION_INFO } from './game-view.js';
import { mapView, journalView } from './journey-view.js';
import { packView, craftView } from './inventory-view.js';
import { menuView, onboardingView, newGameContent, updateNewGameContent, settingsContent, updateSettingsContent, aboutContent, tutorialContent } from './menus.js';
import { landscape } from './scenery.js';
import { sound, suspendAudio, resumeAudio, unlockAudio, configureAudio, updateAmbience, actionSound, setNarrationDucking } from './audio.js';
import {createNarrator} from './narration.js';
import { animateAction, animateHud } from './motion.js';
import {pageOf,pager,pageSize} from './layout.js';
import {storyView,updateStoryVoice,updateStoryNarration} from './story-view.js';
import {resultView,carcassView} from './results-view.js';
import {guideStep,progressGuide,reconcileGuide,showGuide,clearGuide} from './guide.js';
import {repairCost,requiredTools,workingTool} from '../game/tools.js';
import {createCommerce,commerceView} from './commerce.js';

if(!globalThis.structuredClone)globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));
const app=document.getElementById('app'),modalRoot=document.getElementById('modal-root'),toastRoot=document.getElementById('toast-root');
let content,game=null,saved=null,checkpoint=null,records=readRecords(),settings=readSettings();
let screen='menu',tab='camp',packFilter='all',craftFilter='camp',mapSelection='forest',onboardStep=0;
let pages={pack:0,craft:0,actions:0,quests:null,logs:0},questGroup='main';
let modalType=null,modalOptions={},toastTimer,lastFocus=null,busy=false;
let setup={scenario:'last_ember',difficulty:'survivor',permadeath:false};
let storyReplay=false,storyIndex=0,storyReturn='menu';
const commerce=createCommerce();commerce.refresh();
let handlingReward=false,lastBreakActions=0;
function syncAdContext(){const safe=screen==='menu'&&!modalType||screen==='game'&&game&&!modalType&&!busy&&!game.state.tutorial?.active&&!game.state.receipt&&!game.state.combat&&!game.state.event&&!game.state.carcass&&!game.state.dead;commerce.banner(!!safe);}
function processPendingReward(){
 const pending=commerce.state.pendingReward;if(handlingReward||!pending||!game||screen!=='game'||commerce.state.fullscreen)return;
 handlingReward=true;
 try{
  if(pending.runId!==game.state.runId){commerce.acknowledge(pending.id);return;}
  const result=game.claimSupportReward(pending);
  if(result.ok){persist();commerce.acknowledge(pending.id);if(!result.duplicate){modalType='result';render();}}
 }finally{handlingReward=false;}
}
window.addEventListener('wildfall:commerce',event=>{commerce.update(event.detail);syncAdContext();if(modalType==='store')renderModal();processPendingReward();});
const narrator=createNarrator({onPlaying:active=>{setNarrationDucking(active);updateStoryNarration(app,active,settings.narration);}});
function syncNarration(){if(screen==='story'){narrator.update(content.story[storyReplay?storyIndex:game.state.prologue.step],game?.state.scenario||saved?.state.scenario,settings.narration);updateStoryNarration(app,narrator.status().playing,settings.narration);}else narrator.stop();}
const preferences=()=>{document.documentElement.classList.toggle('no-motion',!settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches);document.documentElement.classList.toggle('large-text',settings.largeText);};
function toast(message,error=false){clearTimeout(toastTimer);toastRoot.innerHTML=`<div class="toast ${error?'error':''}">${esc(message)}</div>`;toastTimer=setTimeout(()=>toastRoot.innerHTML='',error?4000:1800);}
function haptic(){if(settings.vibration){try{if(globalThis.Android?.haptic)Android.haptic();else navigator.vibrate?.(12);}catch{}}}
function persist(){
  if(!game)return;
  records.bestMinutes=Math.max(records.bestMinutes,game.state.counters.minutesSurvived);
  saveRecords(records);
  if(!saveRun(game.state,checkpoint))toast('Storage unavailable. Keep the app open to preserve this journey.',true);
  saved={state:structuredClone(game.state),checkpoint:checkpoint?structuredClone(checkpoint):null};
}
function render({preserveScroll=false}={}){
  const top=window.scrollY;
  preferences();
  if(screen==='story')app.innerHTML=storyView(content,game?.state||saved?.state||{scenario:'last_ember'},storyReplay,storyIndex,settings.narration);
  else if(screen==='onboarding')app.innerHTML=onboardingView(onboardStep);
  else if(screen==='menu')app.innerHTML=menuView(saved,records);
  else if(game){
    prepareGuide();
    const views={camp:()=>campView(game,pages.actions),map:()=>mapView(game,mapSelection),pack:()=>packView(game,packFilter,pages.pack),craft:()=>craftView(game,craftFilter,pages.craft),journal:()=>journalView(game,questGroup,pages.quests)};
    app.innerHTML=shell(game,tab,views[tab](),records);
  }
  if(!preserveScroll)window.scrollTo(0,0);else window.scrollTo(0,top);
  renderModal();
  const storySound=screen==='story'?content.story[storyReplay?storyIndex:game.state.prologue.step].ambience:null;
  updateAmbience(screen==='game'?game?.state:storySound?{location:storySound.location,weather:storySound.weather||game?.state.weather||saved?.state.weather||'clear',camp:{fire:0}}:null,settings);
  syncNarration();
  renderGuide();
  syncAdContext();processPendingReward();
}
function prepareGuide(){
 if(reconcileGuide(game.state,content))persist();
 const g=guideStep(game,tab,modalType);if(!g||game.state.receipt||game.state.combat||game.state.event||game.state.carcass)return;
 if(g.recipe&&tab==='craft'){craftFilter=content.recipes[g.recipe].category;const rows=Object.entries(content.recipes).filter(([,r])=>r.category===craftFilter);pages.craft=Math.floor(Math.max(0,rows.findIndex(([id])=>id===g.recipe))/pageSize('craft'));}
 if(g.item&&tab==='pack'){packFilter=g.drop?'all':['food','water'].includes(content.items[g.item].category)?'food':content.items[g.item].category;const rows=Object.entries(game.state.items).filter(([id,n])=>n>0&&(packFilter==='all'||(packFilter==='food'?['food','water'].includes(content.items[id].category):content.items[id].category===packFilter)));const index=rows.findIndex(([id])=>id===g.item);pages.pack=Math.floor(Math.max(0,index)/pageSize('pack'));}
 if(g.map&&tab==='map')mapSelection=g.location;
 if(g.action&&tab==='camp'){const actions=game.state.location==='camp'?['gather','forage','rest','sleep']:content.locations[game.state.location].actions.filter(id=>!['fire','rest'].includes(id));pages.actions=Math.floor(Math.max(0,actions.indexOf(g.action))/pageSize('actions'));}
}
function renderGuide(){clearGuide();if(screen==='game'&&!busy&&game?.state.tutorial?.active&&(!modalType||['fire-dialog','craft-dialog','travel-dialog','action-dialog','item-info'].includes(modalType)))showGuide(game,tab,modalType);}
function openModal(type,options={}){
  lastFocus=document.activeElement;modalType=type;modalOptions=options;renderModal();
  renderGuide();
  syncAdContext();
}
function closeModal(){modalType=null;modalOptions={};renderModal();renderGuide();syncAdContext();if(lastFocus?.isConnected)lastFocus.focus();}
function dialogBasics(ic,title,text){return `<div class="dialog-icon">${icon(ic,58)}</div><h2 id="dialog-title">${esc(title)}</h2>${text?`<p class="modal-intro">${esc(text)}</p>`:''}`;}
function toolFacts(action,options={}){const ids=requiredTools(game.state,content,action,options);return ids.length?`<div class="tool-needs">${ids.map(id=>{const tool=workingTool(game.state,id),broken=game.state.gear.find(g=>g.id===id);return `<span class="${tool?'ready':'missing'}">${itemArt(content.items[id])}${esc(content.items[id].name)} · ${tool?'ready':broken?'worn out':'needed'}${tool?'':broken?button('Repair','perform',{kind:'repair',uid:broken.uid},'text-button',!!game.reason('repair',{uid:broken.uid})):button('Craft','craft-dialog',{id},'text-button')}</span>`;}).join('')}</div>`:'';}
function illustratedDialog(path,title,text){return `<div class="dialog-art-stage">${art(path,'dialog-art','',false)}</div><h2 id="dialog-title">${esc(title)}</h2><p class="modal-intro">${esc(text)}</p>`;}
function costFacts(action,options={}){const p=game.preview(action,options),cost=game.actionCost(action,options);return p?`<div class="dialog-facts cost-preview"><span>${icon('clock',19)}${duration(cost.minutes||0)}</span><span>${icon('lightning',19)}${Math.ceil(p.stamina)}</span><span>${icon('bowl-food',19)}−${Math.ceil(p.calories)} kcal</span><span>${icon('drop',19)}−${Math.ceil(p.hydration)} ml</span></div>${p.dead?'<p class="dialog-reason">Your current condition makes this action fatal. Use supplies first.</p>':''}`:'';}
function denial(reason){return reason?`<div class="dialog-reason">${esc(reason)}</div>`:'';}
function modalBody(){
 if(modalType==='store')return commerceView(commerce.state,game,screen==='game',modalOptions.panel);
 const s=game?.state;
 switch(modalType){
 case 'new-game':return newGameContent(content,setup,records,!!saved);
 case 'settings':return settingsContent(settings);
 case 'about':return aboutContent();
 case 'tutorial':return tutorialContent();
 case 'result':return resultView(game,pages.results||0);
 case 'carcass':return carcassView(game);
 case 'history':{const p=pageOf(s.logs,pages.logs,5);return `<span class="overline">ON THE TRAIL</span><h2>Field notes</h2><div class="full-log">${p.entries.map(log=>`<article class="log ${log.tone}"><span>D${dayOf({time:log.time})}<br>${clockText({time:log.time})}</span><p>${esc(log.text)}</p></article>`).join('')}</div>${pager(p,'logs')}`;}
 case 'pause':return dialogBasics('tent','Journey paused','Time advances only when you act. Your journey is saved.')+button('Resume','resume',{},'primary-button full-width')+button('Supplies & Remove Ads','store',{},'secondary-button full-width')+button('Main menu','menu',{},'text-button full-width');
 case 'action-dialog':{const action=modalOptions.kind,[name,ic,desc]=ACTION_INFO[action],reason=game.reason(action);const note=action==='sleep'?'Rest for six hours. Food and water still decrease. Shelter improves recovery.':action==='rest'?'Recover stamina and reduce fatigue for one hour.':action==='explore'?'Discover new routes and rescue clues. Encounters may occur.':action==='gather'||action==='forage'?'Supplies depend on this location and your equipment. Pack space limits what you keep.':desc;return dialogBasics(ic,name,note)+toolFacts(action)+costFacts(action)+denial(reason)+button(`${name} ${icon('arrow-right',18)}`,'perform',{kind:action},'primary-button full-width',!!reason);}
 case 'travel-dialog':{const id=modalOptions.id,l=content.locations[id],reason=game.reason('travel',{id}),route=game.routeTo(id);return `<div class="event-illustration">${landscape(l.biome)}</div><span class="overline">ON THE TRAIL</span><h2 id="dialog-title">${esc(l.name)}</h2><p class="modal-intro">${esc(l.description)}</p>${costFacts('travel',{id})}${route?`<p class="dialog-note route-note">${route.path.map(k=>esc(content.locations[k].name)).join(' → ')}</p>`:''}${denial(reason)}${button(`Travel ${icon('arrow-right',18)}`,'perform',{kind:'travel',id},'primary-button full-width',!!reason)}`;}
 case 'craft-dialog':{const id=modalOptions.id,r=content.recipes[id],item=content.items[r.item],reason=game.reason('craft',{id});return illustratedDialog(r.art,r.name,r.description||item?.description||'')+`<div class="dialog-cost">${costMarkup(r.cost,content,s)}</div>`+toolFacts('craft',{id})+costFacts('craft',{id})+denial(reason)+button(`${r.structure?'Build':r.category==='cooking'?'Cook':'Craft'} ${icon('hammer',19)}`,'perform',{kind:'craft',id},'primary-button full-width',!!reason);}
 case 'fire-dialog':{if(!s.camp.firepit)return illustratedDialog(content.recipes.firepit.art,'Start an ember','Build a fire ring, then add fuel.')+button('Build fire ring','craft-dialog',{id:'firepit'},'primary-button full-width');const reason=game.reason('fire');return illustratedDialog(`assets/art/structures/${s.camp.fire>0?'firepit':'firepit_cold'}.webp`,s.camp.fire>0?'Keep the ember alive':'Light the fire',s.camp.fire>0?`${duration(s.camp.fire)} of warmth remains.`:'Warmth and cooking start here.')+`<p class="dialog-note">${s.camp.fire_cover?'Fire canopy built · protected from rain.':'Exposed fire · rain puts it out, even with a sleeping shelter.'}</p><div class="dialog-cost">${costMarkup({wood:2,...(s.camp.fire>0?{}:{fiber:1})},content,s)}</div>`+toolFacts('fire')+costFacts('fire')+denial(reason)+button('Add fuel','perform',{kind:'fire'},'primary-button full-width',!!reason)+(!s.camp.fire_cover?button('Build fire canopy','craft-dialog',{id:'fire_cover'},'secondary-button full-width'):'');}
 case 'shelter-dialog':{const id=s.camp.shelter===0?'shelter':s.camp.shelter===1?'shelter2':'shelter3';return illustratedDialog(content.recipes[['shelter','shelter','shelter2','shelter3'][s.camp.shelter]].art,['Build a refuge','Canvas shelter','Timber cabin','Alpine lodge'][s.camp.shelter],'A dry bed. Cold protection. Better recovery.')+(s.camp.shelter<3?button('View upgrade','craft-dialog',{id},'primary-button full-width'):'<p class="dialog-note">Maximum shelter level.</p>');}
 case 'item-info':{const id=modalOptions.id,item=content.items[id],gear=s.gear.find(g=>g.uid===modalOptions.uid),consumable=['food','water','medicine'].includes(item.category);return illustratedDialog(item.art,item.name,item.description)+`<div class="dialog-facts"><span>${item.weight} kg each</span>${gear?`<span>${gear.durability} / ${item.durability} durability</span>`:`<span>×${s.items[id]||0} in pack</span>`}${item.calories?`<span>+${item.calories} kcal</span>`:''}${item.hydration?`<span>+${item.hydration} ml</span>`:''}${item.heal?`<span>+${item.heal} health</span>`:''}${item.injury?`<span>${item.injury} injury</span>`:''}${item.sickness?`<span>${item.sickness} sickness</span>`:''}${item.damage?`<span>${item.damage} attack base</span>`:''}${item.warmth&&item.category==='gear'?`<span>+${item.warmth}°C protection</span>`:''}${item.armor?`<span>${item.armor} armor</span>`:''}${item.risk?`<span class="text-danger">${Math.round(item.risk*100)}% sickness risk</span>`:''}</div>${item.carried?'<p class="dialog-note">Carried kit · used automatically. No equipment slot needed.</p>':''}${gear?`<div class="dialog-cost">${costMarkup(repairCost(content,id),content,s)}</div><p class="dialog-note">Repair materials · up to +40 durability.</p>`:''}<div class="item-dialog-buttons">${consumable?button('Use one','perform',{kind:'use',id},'primary-button'):gear&&!item.carried?button(s.equipment[item.slot]===gear.uid?'Unequip':'Equip','perform',{kind:'equip',uid:gear.uid},'primary-button',gear.durability<=0):''}${gear?button('Repair','perform',{kind:'repair',uid:gear.uid},'secondary-button',!!game.reason('repair',{uid:gear.uid})):''}</div>${item.category!=='quest'?button(`${icon('trash',17)}Drop ${gear?'gear':'one'}`,'perform',{kind:'drop',id,...(gear?{uid:gear.uid}:{})},'drop-button'):''}`;}
 case 'equipment':{const list=s.gear.filter(g=>content.items[g.id].slot===modalOptions.slot);return dialogBasics({tool:'axe',weapon:'sword',clothing:'coat-hanger'}[modalOptions.slot],'Choose your gear','One item per slot. Repair at camp.')+`<div class="event-options">${list.length?list.map(gear=>button(`${itemArt(content.items[gear.id],'gear-choice-art')}<span><b>${esc(content.items[gear.id].name)}</b><small>${gear.durability} / ${content.items[gear.id].durability} ${s.equipment[modalOptions.slot]===gear.uid?'· Equipped':''}</small></span>${icon('caret-right',18)}`,'item-info',{id:gear.id,uid:gear.uid},'event-choice')).join(''):'<p class="dialog-note">No gear for this slot. Visit the workbench.</p>'}</div>`;}
 case 'condition':return dialogBasics('heart','Body condition','Time advances only when you act.')+`<div class="condition-grid">${[['Health',Math.round(s.stats.health)+' / 100'],['Stamina',Math.round(s.stats.stamina)+' / 100'],['Food',Math.round(s.stats.calories)+' kcal'],['Water',Math.round(s.stats.hydration)+' ml'],['Body temperature',s.stats.temperature.toFixed(1)+'°C'],['Fatigue',Math.round(s.stats.fatigue)+'%'],['Injury',Math.round(s.stats.injury)+'%'],['Sickness',Math.round(s.stats.sickness)+'%']].map(([label,val])=>`<div class="condition-card"><small>${label}</small><b>${val}</b></div>`).join('')}</div><p class="dialog-note">Bandages treat injuries; tea and medicine treat sickness. Stay above 35.5°C. Sleep to reduce fatigue.</p>`;
 case 'event':{const e=content.events[s.event];return `<div class="event-illustration">${landscape(content.locations[s.location].biome)}${s.event==='stranger'?art(content.scenarios.riverborn.art,'event-traveller','A masked traveller',false):''}</div><span class="overline">ON THE TRAIL</span><h2 id="dialog-title">${esc(e.title)}</h2><p class="modal-intro">${esc(e.text)}</p><div class="event-options">${e.choices.map((choice,i)=>{const reason=game.reason('resolveEvent',{choice:i});return button(`<span><b>${esc(choice.label)}</b><small>${esc(choice.description)}</small><span class="choice-cost">${duration(choice.minutes)} · ${Math.ceil(game.effort('resolveEvent',{choice:i}))} stamina${reason?`<br>${esc(reason)}`:''}</span></span>${icon('arrow-right',18)}`,'perform',{kind:'resolveEvent',choice:i},`event-choice ${reason?'unavailable':''}`,!!reason);}).join('')}</div>`;}
 case 'combat':{const f=s.combat,e=content.enemies[f.id],weapon=equipped(s,content,'weapon'),tool=equipped(s,content,'tool'),ready=weapon?.id!=='bow'||s.items.arrows>0,used=ready&&weapon?weapon:tool,base=used?.damage||4;return `<span class="overline">ENCOUNTER · TURN ${f.turn+1}</span><h2 id="dialog-title">${esc(e.name)}</h2><div class="battle-stage" data-enemy-hp="${f.health}" data-enemy-max="${f.maxHealth}">${art(content.locations[s.location].art,'battle-background','',false)}<div class="battle-shade"></div><div class="battle-survivor">${art(content.scenarios[s.scenario]?.art||content.scenarios.last_ember.art,'battle-actor','Your hooded survivor',false)}<span>YOU · ${Math.round(s.stats.health)} HP</span></div><div class="battle-enemy">${art(e.art,'battle-actor',e.name,false)}<span>${f.health} / ${f.maxHealth} HP</span></div><div class="battle-enemy-meter meter"><i style="width:${f.health/f.maxHealth*100}%"></i></div></div><div class="battle-preparation"><span>${icon('lightning',19)}${Math.round(s.stats.stamina)} stamina</span><span>${used?itemArt(used):icon('sword',20)}${esc(used?.name||'Bare hands')}</span>${weapon?.id==='bow'?`<span>${itemArt(content.items.arrows)}×${s.items.arrows||0}</span>`:''}<span>${icon('shield',19)}${equipped(s,content,'clothing')?.armor||0} armor</span></div><div class="combat-log">${f.messages.slice(-2).map(m=>`<p>${esc(m)}</p>`).join('')}</div><div class="combat-options">${[['attack','Attack',`${base}–${base+4} damage`,'sword'],['power','Power strike','×1.5 damage · +15% incoming','lightning'],['defend','Guard','Recover up to 8 · −65% incoming','shield'],['flee','Retreat','Escape can fail','arrow-left']].map(([move,label,note,ic])=>button(`${icon(ic,28)}<span><b>${label}</b><small>${note}</small><em>${Math.ceil(game.effort('combat',{move}))} stamina</em></span>`,'perform',{kind:'combat',move},move,!!game.reason('combat',{move}))).join('')}</div><div class="combat-pack">${['bandage','medicine','ration'].filter(id=>s.items[id]).map(id=>button(`${itemArt(content.items[id])}${esc(content.items[id].name)}`,'perform',{kind:'use',id})).join('')}</div>`;}
 case 'death':return dialogBasics('flame','The last ember fades.',s.permadeath?'This journey ends. Your record remains.':'Restore your latest dawn checkpoint, or start again.')+`<div class="death-stats"><div><b>${dayOf(s)}</b><small>final day</small></div><div><b>${s.counters.crafted}</b><small>crafted</small></div><div><b>${s.quests.completed.length}</b><small>quests</small></div></div><p class="dialog-note">Longest survival: ${survived(records.bestMinutes)}.</p>${!s.permadeath&&checkpoint?button(`Recover · day ${dayOf(checkpoint)}`,'recover',{},'primary-button full-width'):''}${button('New journey','new-game',{},'secondary-button full-width')}${button('Share your story','share',{},'text-button full-width')}${button('Main menu','menu',{},'text-button full-width')}`;
 case 'victory':return dialogBasics('broadcast','The world hears you.','A voice breaks through the static. Rescue is on its way.')+`<div class="death-stats"><div><b>${dayOf(s)}</b><small>rescue day</small></div><div><b>${s.visited.length}</b><small>locations</small></div><div><b>${s.quests.completed.length}</b><small>quests</small></div></div>${button('Continue endless survival','close-modal',{},'primary-button full-width')}${button('Share your rescue','share',{},'secondary-button full-width')}`;
 case 'rate':return dialogBasics('star','How was your journey?','Rate your experience on this device.')+`<div class="rating-stars">${[1,2,3,4,5].map(n=>button(icon('star',33),'rating',{value:n},records.rating>=n?'selected':'')).join('')}</div><p class="dialog-note centered">${records.rating?`Thank you. ${records.rating}/5 saved.`:'Choose one to five stars.'}</p><p class="settings-footer">LOCAL RATING · PLAY STORE RELEASE PENDING</p>`;
 case 'exit':return dialogBasics('tent','Rest a while?','Your journey is saved.')+button('Close app','exit-app',{},'primary-button full-width')+button('Stay in the valley','close-modal',{},'secondary-button full-width');
 default:return '';
 }
}

function renderModal(){
  if(screen==='game'&&game){
    if(game.state.dead&&modalType!=='new-game')modalType='death';
    else if(!['new-game','pause','settings','about','tutorial','rate'].includes(modalType)){
      if(game.state.receipt)modalType='result';else if(game.state.carcass)modalType='carcass';else if(game.state.combat)modalType='combat';else if(game.state.event)modalType='event';
    }
  }
  if(!modalType){modalRoot.innerHTML='';delete modalRoot.dataset.type;document.body.classList.remove('modal-open');app.inert=false;app.removeAttribute('aria-hidden');return;}
  if(modalType==='new-game'&&modalRoot.dataset.type==='new-game'&&modalRoot.querySelector('.modal')){updateNewGameContent(modalRoot,setup);return;}
  if(modalType==='settings'&&modalRoot.dataset.type==='settings'&&modalRoot.querySelector('.modal')){updateSettingsContent(modalRoot,settings);return;}
  const locked=['death','event','combat','result','carcass'].includes(modalType);
  const scroll=modalRoot.querySelector('.modal')?.scrollTop||0;
  const previous=modalRoot.dataset.type;
  modalRoot.innerHTML=`<div class="modal-overlay" data-ui="modal-backdrop"><section class="modal ${modalType==='combat'?'combat-modal':['result','carcass'].includes(modalType)?'result-modal':''}" role="dialog" aria-modal="true" aria-label="${esc(({ 'new-game':'New journey', settings:'Settings', about:'About WILDFALL', tutorial:'Field guide', event:'Event', combat:'Encounter', result:'Action results',carcass:'Harvest carcass',death:'Journey ended' })[modalType]||'Journey choices')}" tabindex="-1">${!locked?button(icon('x',20),'close-modal',{},'modal-close',false):''}${modalBody()}</section></div>`;
  modalRoot.dataset.type=modalType;
  if(modalType==='new-game')updateNewGameContent(modalRoot,setup);
  document.body.classList.add('modal-open');
  app.inert=true;app.setAttribute('aria-hidden','true');
  if(previous===modalType)modalRoot.querySelector('.modal').scrollTop=scroll;
  else modalRoot.querySelector('.modal').focus({preventScroll:true});
}
async function share(){
  const state=game?.state||saved?.state;
  const text=state?`I survived ${survived(state.counters.minutesSurvived)} in WILDFALL: Last Ember. ${state.flags.rescued?'My rescue signal was received!':'One ember. Another dawn.'} ${state.quests.completed.length}/15 quests complete. Offline wilderness survival in Ashen Valley.`:'WILDFALL: Last Ember — offline wilderness survival. Explore, build a camp, and find your way home. One ember. Another dawn.';
  try{
    if(globalThis.Android?.share){Android.share(text);return;}
    if(navigator.share){await navigator.share({title:'WILDFALL: Last Ember',text});return;}
    await navigator.clipboard.writeText(text);toast('Journey copied. Share it in your favorite app.');
  }catch(error){if(error.name!=='AbortError')toast('Share is available in the Android app.',true);}
}
async function act(kind,options={}){
  if(busy||!game||game.state.receipt)return;
  busy=true;
  syncAdContext();
  clearGuide();
  try{
    const before=structuredClone(game.state),wasRescued=game.state.flags.rescued,result=game.perform(kind,options);
    if(!result.ok){toast(result.message,true);sound('danger',settings.sound);return;}
    progressGuide(game.state,kind,options,content);pages.results=0;
    if(result.dawn)checkpoint=structuredClone(game.state);
    if(game.state.dead&&game.state.permadeath)checkpoint=null;
    if(!wasRescued&&game.state.flags.rescued)records.rescues++;
    persist();haptic();
    updateAmbience(game.state,settings);
    actionSound(kind,options,result,before,content,settings);
    document.body.classList.add('action-busy');
    try{await animateAction(kind,options,result,before,content,settings);}finally{document.body.classList.remove('action-busy');}
    modalType=null;
    if(kind==='travel'){tab='camp';mapSelection=game.state.location;pages.actions=0;}
    render({preserveScroll:kind!=='travel'});
    animateHud(before,game.state,settings.motion);
    if(!game.state.dead&&!game.state.combat&&!game.state.event&&!modalType)toast(result.quests.length?`Quest complete: ${content.quests.main.concat(content.quests.side).find(q=>q.id===result.quests[0]).title}`:result.message);
  }finally{busy=false;document.body.classList.remove('action-busy');renderGuide();syncAdContext();processPendingReward();}
}
function ui(action,data){
  switch(action){
    case 'tab':tab=data.tab;closeModal();render();break;
    case 'menu':{const s=game?.state,eligible=screen==='game'&&s&&!s.tutorial?.active&&!s.combat&&!s.event&&!s.receipt&&!s.carcass&&s.counters.actions-lastBreakActions>=8;persist();screen='menu';modalType=null;render();if(eligible){lastBreakActions=s.counters.actions;commerce.interstitial();}break;}
    case 'continue':if(saved){game=new GameEngine(content,saved.state);checkpoint=saved.checkpoint;screen=game.state.prologue&&!game.state.prologue.complete?'story':'game';storyReplay=false;modalType=null;persist();render();}break;
    case 'new-game':setup={scenario:'last_ember',difficulty:'survivor',permadeath:false};openModal('new-game');break;
    case 'scenario':setup.scenario=data.id;renderModal();break;
    case 'difficulty':setup.difficulty=data.id;renderModal();break;
    case 'permadeath':setup.permadeath=!setup.permadeath;renderModal();break;
    case 'start-game':game=new GameEngine(content,null,{...setup,seed:crypto.getRandomValues(new Uint32Array(1))[0]||2026});game.state.prologue={step:0,complete:false};game.state.tutorial={step:0,active:true,version:2,usedWater:false,usedFood:false};checkpoint=structuredClone(game.state);records.runs++;screen='story';storyReplay=false;tab='camp';modalType=null;pages={pack:0,craft:0,actions:0,quests:null,logs:0,results:0};packFilter='all';craftFilter='camp';questGroup='main';persist();render();break;
    case 'story-voice':settings.narration=!settings.narration;saveSettings(settings);updateStoryVoice(app,settings.narration);syncNarration();break;
    case 'story-replay-voice':narrator.replay();break;
    case 'story-next':if(storyReplay)storyIndex=Math.min(4,storyIndex+1);else{game.state.prologue.step=Math.min(4,game.state.prologue.step+1);persist();}render();break;
    case 'story-back':if(storyReplay)storyIndex=Math.max(0,storyIndex-1);else{game.state.prologue.step=Math.max(0,game.state.prologue.step-1);persist();}render();break;
    case 'story-skip':game.state.prologue.complete=true;if(checkpoint?.prologue)checkpoint.prologue.complete=true;screen='game';persist();render();break;
    case 'story-replay':storyReturn=screen;storyReplay=true;storyIndex=0;screen='story';modalType=null;render();break;
    case 'story-close':storyReplay=false;screen=storyReturn;render();break;
    case 'guide-replay':if(!game&&saved){game=new GameEngine(content,saved.state);checkpoint=saved.checkpoint;}if(!game||game.state.dead){openModal('new-game');break;}screen='game';if(game.state.prologue)game.state.prologue.complete=true;if(checkpoint?.prologue)checkpoint.prologue.complete=true;game.state.tutorial={step:0,active:true,version:2,usedWater:false,usedFood:false};tab='camp';modalType=null;persist();render();break;
    case 'guide-next':if(game.state.tutorial.step===8){game.state.tutorial.active=false;lastBreakActions=game.state.counters.actions;}else game.state.tutorial.step++;persist();render();break;
    case 'skip-guide':game.state.tutorial.active=false;lastBreakActions=game.state.counters.actions;persist();render();break;
    case 'purchase-remove-ads':commerce.purchase();break;
    case 'restore-purchases':commerce.restore();break;
    case 'commerce-panel':modalOptions.panel=data.panel==='ads'?'ads':'supplies';renderModal();break;
    case 'load-reward':commerce.load();break;
    case 'watch-reward':if(screen==='game'&&game&&!game.supportRewardReason()&&commerce.state.rewardedReady){persist();commerce.rewarded({runId:game.state.runId,day:dayOf(game.state)});}break;
    case 'acknowledge-result':{const rescued=game.state.receipt?.kind==='signal'&&game.state.flags.rescued;game.state.receipt=null;modalType=rescued?'victory':null;persist();render();break;}
    case 'pack-filter':packFilter=data.filter;pages.pack=0;render();break;
    case 'craft-filter':craftFilter=data.filter;pages.craft=0;render();break;
    case 'page':pages[data.scope]=Number(data.page);render();break;
    case 'quest-group':questGroup=data.group;pages.quests=null;render();break;
    case 'select-location':mapSelection=data.id;render({preserveScroll:true});break;
    case 'perform':act(data.kind,{id:data.id,uid:data.uid,choice:data.choice===undefined?undefined:Number(data.choice),move:data.move,part:data.part});break;
    case 'close-modal':if(!['event','combat','death','result','carcass'].includes(modalType))closeModal();break;
    case 'modal-backdrop':if(!['event','combat','death','result','carcass'].includes(modalType))closeModal();break;
    case 'resume':modalType=null;renderModal();break;
    case 'recover':if(checkpoint&&!game.state.permadeath){game=new GameEngine(content,checkpoint);game.log('Restored the latest dawn checkpoint.','story');persist();modalType=null;render();}break;
    case 'toggle-setting':settings[data.key]=!settings[data.key];saveSettings(settings);preferences();configureAudio(settings);syncNarration();renderModal();break;
    case 'share':share();break;
    case 'rating':records.rating=Number(data.value);saveRecords(records);renderModal();haptic();break;
    case 'onboarding-next':onboardStep=Math.min(2,onboardStep+1);render();break;
    case 'onboarding-step':onboardStep=Number(data.step);render();break;
    case 'skip-onboarding':try{localStorage.setItem('wildfall-onboarded','1');}catch{}screen='menu';render();break;
    case 'exit-app':persist();if(globalThis.Android?.exit)Android.exit();else{screen='menu';modalType=null;render();}break;
    default:openModal(action,data);
  }
}
document.addEventListener('click',event=>{
  const target=event.target.closest('button[data-ui],button[data-action],.modal-overlay');
  if(!target||target.disabled||busy||commerce.state.fullscreen)return;
  unlockAudio(settings);
  if(target.classList.contains('modal-overlay')&&event.target!==target)return;
  if(target.dataset.action){const kind=target.dataset.action;if(['gather','forage','explore','mine','water','fish','hunt','rest','setTrap','checkTrap','craft'].includes(kind)&&!game.reason(kind,target.dataset)&&game.preview(kind,target.dataset)?.dead){openModal(kind==='craft'?'craft-dialog':'action-dialog',{...target.dataset,kind});return;}act(kind,target.dataset);return;}
  sound('tap',settings.sound);ui(target.dataset.ui,target.dataset);
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();globalThis.wildfallBack();}
  if(event.key==='Tab'&&modalType){
    const controls=[...modalRoot.querySelectorAll('button:not([disabled]),summary,[tabindex="0"]')];
    if(!controls.length)return;
    if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
  }
});
globalThis.wildfallBack=()=>{
  if(busy||commerce.state.fullscreen)return;
  if(screen==='story'){if(storyReplay)ui('story-close',{});else ui('story-skip',{});return;}
  if(modalType==='result')return;
  if(modalType==='carcass'){openModal('pause');return;}
  if(['event','combat'].includes(modalType)){openModal('pause');return;}
  if(modalType==='death'){screen='menu';modalType=null;render();return;}
  if(modalType){closeModal();return;}
  if(screen==='game'){openModal('pause');return;}
  if(screen==='onboarding'){screen='menu';render();return;}
  openModal('exit');
};
globalThis.wildfallPause=()=>{persist();narrator.suspend();suspendAudio();};
globalThis.wildfallResume=()=>{resumeAudio();narrator.resume();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)globalThis.wildfallPause();else globalThis.wildfallResume();});
window.addEventListener('pagehide',()=>narrator.stop());
document.addEventListener('input',event=>{const key=event.target.dataset.volume;if(!['sfxVolume','ambientVolume'].includes(key))return;settings[key]=Math.max(0,Math.min(1,Number(event.target.value)/100));saveSettings(settings);configureAudio(settings);event.target.closest('label').querySelector('output').value=Math.round(settings[key]*100)+'%';});
document.addEventListener('change',event=>{const scope=event.target.dataset.filter;if(scope==='pack'){packFilter=event.target.value;pages.pack=0;}else if(scope==='craft'){craftFilter=event.target.value;pages.craft=0;}else return;render();});
window.addEventListener('pagehide',persist);
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!busy&&screen==='game')render({preserveScroll:true});},150);});

async function boot(){
  const names=['items','recipes','locations','weather','enemies','events','scenarios','quests','story'];
  content=Object.fromEntries(await Promise.all(names.map(async name=>{const response=await fetch(`data/${name}.json`);if(!response.ok)throw new Error('Could not load '+name+'.');return [name,await response.json()];})));
  saved=loadSave(content);
  let onboarded=false;try{onboarded=localStorage.getItem('wildfall-onboarded')==='1';}catch{}
  screen='menu';
  content.story.forEach(scene=>{const preload=new Image();preload.src=scene.art;});
  await new Promise(resolve=>setTimeout(resolve,600));render();
}
boot().catch(error=>{app.innerHTML=`<div class="splash">${icon('warning',40)}<h2>The valley is not ready.</h2><p>${esc(error.message)}</p><p>Close and reopen to try again.</p></div>`;});
