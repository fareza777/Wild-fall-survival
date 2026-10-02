import { clockText, dayOf, isNight } from '../game/survival.js';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const symbols=new Set(['compass','heart','lightning','thermometer','moon','sun','cloud','cloud-fog','cloud-rain','cloud-lightning','snowflake','hammer','shield','clock','flag','mountains','paw-print','flame']);
const objects={tree:'wood',plant:'fiber',diamond:'stone',leaf:'herbs',nut:'scrap',hexagon:'ore',cherries:'berries',mushroom:'mushroom',package:'ration',bone:'raw_meat','bowl-food':'stew',fish:'fish','fish-simple':'cooked_fish','cooking-pot':'stew',drop:'water',waves:'dirty_water',coffee:'tea','first-aid':'bandage',pill:'medicine',knife:'knife',axe:'axe',sword:'spear',crosshair:'bow','coat-hanger':'insulated',backpack:'backpack',lasso:'trap',notebook:'journal',cpu:'radio_part','battery-full':'battery',broadcast:'radio'};
export function icon(name,size=20,cls=''){
  const path=symbols.has(name)?`symbols/${name}`:objects[name]?`items/${objects[name]}`:name==='tent'?'structures/shelter':name==='house-line'?'structures/shelter2':null;
  return path?`<img class="icon art-icon ${cls}" src="assets/art/${path}.webp" width="${size}" height="${size}" alt="" aria-hidden="true">`:`<span class="icon ${cls}" style="--icon:url('assets/icons/${esc(name)}.svg');width:${size}px;height:${size}px" aria-hidden="true"></span>`;
}
export function art(path,cls='',alt='',lazy=true){return `<img class="art ${cls}" src="${esc(path)}" alt="${esc(alt)}" ${lazy?'loading="lazy"':''} decoding="async">`;}
export function itemArt(item,cls='',lazy=true){return art(item.art,`item-art ${cls}`,'',lazy);}
export function button(label,action,options={},cls='',disabled=false){
  const labels={'close-modal':'Close dialog',settings:'Settings',condition:'Body condition','item-info':'Item details',rating:`${options.value} stars`,'onboarding-step':`Step ${Number(options.step)+1}`,page:`${options.scope} page ${Number(options.page)+1}`};
  const aria=labels[action]&&(action==='condition'||!label.replace(/<[^>]*>/g,'').trim())?`aria-label="${esc(labels[action])}"`:'';
  return `<button class="${cls}" data-ui="${esc(action)}" ${Object.entries(options).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')} ${aria} ${disabled?'disabled':''}>${label}</button>`;
}
export function actionButton(label,action,options={},cls='',extra=''){return `<button class="${cls}" data-action="${esc(action)}" ${Object.entries(options).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')} ${extra}>${label}</button>`;}
export function duration(minutes){minutes=Math.round(minutes);return minutes<60?`${minutes}m`:`${Math.floor(minutes/60)}h${minutes%60?' '+minutes%60+'m':''}`;}
export function survived(minutes){return `${Math.floor(minutes/1440)}d ${Math.floor(minutes%1440/60)}h`;}
export const timeLabel=state=>`Day ${dayOf(state)} · ${clockText(state)}`;
export const phase=state=>isNight(state)?'Night':(state.time%1440<11*60?'Morning':state.time%1440<16*60?'Daylight':'Dusk');
export function costMarkup(cost,content,state){return Object.entries(cost||{}).map(([id,n])=>`<span class="ingredient ${(state?.items[id]||0)>=n?'enough':'missing'}" title="${esc(content.items[id].name)}">${itemArt(content.items[id])}<b>${n}</b><span>${esc(content.items[id].name)}</span><small>${state?.items[id]||0} owned</small></span>`).join('');}
export function divider(label,aside=''){return `<div class="section-heading"><h3>${label}</h3>${aside}</div>`;}
