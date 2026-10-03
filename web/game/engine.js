import { addLoot, capacity, count, equipped, hasCost, spend, wear, weight } from './inventory.js';
import { advanceAction, ambient, clamp, dayOf, difficultyFactor, exertionCost, fireBurnRate, isNight, normalizeStats, exposedToRain, extinguishFire } from './survival.js';
import { beginCombat, combatTurn } from './combat.js';
import { updateQuests } from './quests.js';
import { englishHistory } from './legacy.js';
import { random } from './random.js';
import { gatherYield,cuttingTool,carcassCost } from './harvesting.js';

const ACTIONS = {
  gather: { minutes:45, stamina:10 }, forage: { minutes:40, stamina:8 }, explore: { minutes:50, stamina:13 },
  mine: { minutes:55, stamina:15 }, water: { minutes:25, stamina:5 }, fish: { minutes:60, stamina:9 },
  hunt: { minutes:75, stamina:18 }, rest: { minutes:60, stamina:0 }, setTrap: { minutes:20, stamina:6 },
  checkTrap: { minutes:15, stamina:4 }, signal: { minutes:30, stamina:5 }, fire: { minutes:15, stamina:4 }
};
const INITIAL_COUNTERS = { woodGathered:0, waterBoiled:0, mealsCooked:0, fishCaught:0, hunts:0, trapsHarvested:0, battlesWon:0, oreMined:0, fires:0, crafted:0, locationsVisited:1, minutesSurvived:0, actions:0 };

export function createState(content, options = {}) {
  const scenarioId = content.scenarios?.[options.scenario] ? options.scenario : 'last_ember';
  const scenario = content.scenarios?.[scenarioId] || {};
  const start = (scenario.startHour || 8) * 60;
  return {
    version:1, scenario:scenarioId, difficulty:['story','survivor','relentless'].includes(options.difficulty) ? options.difficulty : 'survivor',
    permadeath:options.permadeath ?? false, seed:(Number(options.seed) >>> 0) || 78043, time:start, startTime:start,
    location:'camp', weather:scenario.weather || 'clear', nextWeather:start + 240, dead:false,
    stats:{ health:100, stamina:85, calories:scenario.calories || 2200, hydration:scenario.hydration || 2100, temperature:scenario.temperature || 36.8, fatigue:12, injury:0, sickness:0 },
    items:{ ...(scenario.items || { wood:3, stone:2, fiber:2, water:2, ration:2, herbs:1 }) },
    gear:[{ id:'knife', uid:'knife-1', durability:80 }], equipment:{ tool:'knife-1', weapon:null, clothing:null }, nextGear:2,
    camp:{ shelter:0, firepit:false, fire:0, fire_cover:false, rain_collector:false, garden:false },
    visited:['camp'], discovered:['camp','forest', ...(scenario.unlocked || [])], explored:{ ...(scenario.explored || {}) },
    flags:{}, counters:{ ...INITIAL_COUNTERS }, quests:{ completed:[] }, skills:{ gathering:0, hunting:0, crafting:0 },
    traps:[], event:null, combat:null, carcass:null, receipt:null, prologue:null, tutorial:null, lastEvent:null, logs:[{ id:0, time:start, text:'You salvage a knife and supplies from the wreck. Make camp before night.', tone:'story' }], nextLog:1
  };
}

export class GameEngine {
  constructor(content, state, options = {}) {
    this.content = content;
    this.state = state ? structuredClone(state) : createState(content, options);
    if(state){this.state.logs=this.state.logs.map(log=>({...log,text:englishHistory(log.text)}));if(this.state.combat)this.state.combat.messages=this.state.combat.messages.map(englishHistory);}
    this.lastDawn = false;
    this.lastResult = null;
    this.state.camp.fire_cover ??= false;
    for(const key of ['carcass','receipt','prologue','tutorial'])this.state[key] ??= null;
    if(extinguishFire(this.state,content))this.log('Rain extinguished the exposed campfire. Build a fire canopy.','weather');
  }
  random() {
    return random(this.state);
  }
  range(min, max) { return min + Math.floor(this.random() * (max - min + 1)); }
  log(text, tone = 'normal') {
    this.state.logs.unshift({ id:this.state.nextLog++, time:this.state.time, text, tone });
    this.state.logs = this.state.logs.slice(0, 80);
  }
  loot(loot, options) {
    const result = addLoot(this.state, this.content, loot, options);
    const text = Object.entries(result.taken).map(([id, n]) => `${n} ${this.content.items[id].name.toLowerCase()}`).join(', ');
    if (text) this.log(`Collected: ${text}.`, 'loot');
    if (Object.keys(result.left).length) this.log('Pack full. Some supplies were left behind. Free space or craft a backpack.', 'warning');
    this.state.counters.woodGathered += result.taken.wood || 0;
    return result;
  }
  unlocked(id) {
    const s = this.state, l = this.content.locations[id];
    if (!l) return false;
    if (s.discovered.includes(id)) return true;
    return (!l.requiresFlag || s.flags[l.requiresFlag]) && Object.entries(l.requiresExplore || {}).every(([key, n]) => (s.explored[key] || 0) >= n);
  }
  discover() {
    for (const [id, l] of Object.entries(this.content.locations)) {
      if (!this.state.discovered.includes(id) && this.unlocked(id)) {
        this.state.discovered.push(id); this.log(`New route: ${l.name}.`, 'quest');
      }
    }
  }
  routeTo(id) {
    if (!this.unlocked(id) || id === this.state.location) return null;
    const queue = [[this.state.location]], seen = new Set([this.state.location]);
    while (queue.length) {
      const route = queue.shift(), current = route.at(-1);
      for (const neighbor of this.content.locations[current].neighbors) {
        if (!this.unlocked(neighbor) || seen.has(neighbor)) continue;
        const next = [...route, neighbor];
        if (neighbor === id) return { path:next, minutes:next.slice(1).reduce((sum, n, i) => sum + (n === 'camp' ? this.content.locations[next[i]].travel || 25 : this.content.locations[n].travel), 0) };
        seen.add(neighbor); queue.push(next);
      }
    }
    return null;
  }
  danger(id = this.state.location) {
    return Math.min(0.5, (this.content.locations[id]?.danger || 0) * (1 + (dayOf(this.state) - 1) * 0.065) * difficultyFactor(this.state) * (isNight(this.state) ? 1.6 : 1));
  }
  actionCost(action, options = {}) {
    if (action === 'craft') return this.content.recipes[options.id];
    if (action === 'travel') { const route=this.routeTo(options.id); return route ? { minutes:route.minutes, stamina:Math.ceil(route.minutes * 0.18) } : null; }
    if (action === 'sleep') return { minutes:clamp(Number(options.hours) || 6, 1, 8) * 60, stamina:0 };
    if (action === 'combat') return { minutes:5, stamina:({ attack:6, power:13, defend:0, flee:10 })[options.move] ?? 0 };
    if (action === 'resolveEvent') return this.content.events[this.state.event]?.choices[options.choice];
    if(action==='harvestCarcass')return carcassCost(this.state.carcass,this.content,options.part||'all');
    if(action==='leaveCarcass')return this.state.carcass?{minutes:0,stamina:0}:null;
    if (['use','equip','drop','repair'].includes(action)) return { minutes:action === 'repair' ? 30 : 1, stamina:action === 'repair' ? 5 : 0 };
    return ACTIONS[action];
  }
  effort(action, options = {}) { return action==='travel'?this.preview(action,options)?.stamina||0:exertionCost(this.state, this.content, this.actionCost(action, options)?.stamina || 0); }
  preview(action, options = {}) {
    const cost = this.actionCost(action, options);
    if (!cost) return null;
    const copy = structuredClone(this.state), before = copy.stats;
    const stats = { ...before };
    if (action === 'fire') copy.camp.fire = Math.min(960, copy.camp.fire + 360);
    const result=advanceAction(copy, this.content, action, cost, action === 'travel' ? this.routeTo(options.id) : null);
    return { minutes:copy.time-this.state.time, stamina:result.exertion, calories:Math.max(0, stats.calories-copy.stats.calories), hydration:Math.max(0, stats.hydration-copy.stats.hydration), stats:copy.stats, dead:copy.dead };
  }
  reason(action, options = {}) {
    const s=this.state, c=this.content, l=c.locations[s.location];
    if (s.dead) return 'This journey has ended. Start again or restore a checkpoint.';
    if (s.combat && action !== 'combat' && action !== 'use') return 'Finish the encounter first.';
    if (s.event && action !== 'resolveEvent') return 'Choose a response to the current event.';
    if(s.carcass&&!['harvestCarcass','leaveCarcass','use','equip','drop','rest'].includes(action))return 'Harvest the carcass or leave it behind first.';
    if (action === 'resolveEvent' && !s.event) return 'No active event.';
    if (action === 'combat' && (!s.combat || !['attack','power','defend','flee'].includes(options.move))) return 'Invalid combat move.';
    const cost=this.actionCost(action,options);
    if (!cost) return 'Action or route unavailable.';
    const required=this.effort(action, options);
    if (s.stats.stamina + 0.001 < required) return `Need ${Math.ceil(required)} stamina. Rest first.`;
    if(action==='harvestCarcass'){
      if(!cuttingTool(s))return 'Carry a working knife or axe to skin and butcher.';
      if(s.time+cost.minutes>s.carcass.expires)return 'The carcass will spoil before you finish. Leave it behind.';
    }else if(action==='leaveCarcass'){
      // Leaving a carcass is always possible, including with no stamina.
    }else if (action === 'travel') {
      if (options.id === s.location) return 'Already here.';
      if (!this.routeTo(options.id)) return 'Route locked. Explore the previous area.';
    } else if (action === 'craft') {
      const r=c.recipes[options.id];
      if (s.location !== 'camp') return 'Craft at camp.';
      if (!hasCost(s,r.cost)) return 'More materials needed.';
      if(r.requiresFire&&exposedToRain(s,c))return 'Rain puts out exposed fires. Build a fire canopy first.';
      if (r.requiresFire && s.camp.fire < r.minutes * fireBurnRate(s,c)) return 'Fire must last through cooking. Add wood first.';
      if (r.requiresFlag && !s.flags[r.requiresFlag]) return 'Find the ranger journal first.';
      if (Object.entries(r.requiresStructure || {}).some(([id,n]) => s.camp[id] < n)) return 'Build the previous shelter upgrade first.';
      if (r.structure && Number(s.camp[r.structure]) >= (r.level || 1)) return 'Already built.';
      if (r.unique && count(s,r.item)) return 'Already in your pack.';
      if (r.item) {
        const freed=Object.entries(r.cost).reduce((sum,[id,n])=>sum+c.items[id].weight*n,0);
        if (weight(s,c)-freed+c.items[r.item].weight*(r.quantity || 1) > capacity(s)+0.001 && c.items[r.item].category !== 'quest') return 'Not enough pack space.';
      }
    } else if (action === 'use') {
      const item=c.items[options.id];
      if (!item || !count(s,options.id)) return 'Item unavailable.';
      if (!['food','water','medicine'].includes(item.category)) return 'This item cannot be consumed.';
    } else if (action === 'equip' || action === 'repair') {
      const gear=s.gear.find(g=>g.uid===options.uid);
      if (!gear) return 'Equipment unavailable.';
      if (action === 'equip' && gear.durability <= 0) return 'Equipment broken. Repair at camp.';
      if (action === 'repair' && (s.location !== 'camp' || !hasCost(s,{scrap:1,fiber:2}))) return 'Repair at camp: one scrap and two fiber.';
      if (action === 'repair' && gear.durability >= c.items[gear.id].durability) return 'Equipment is fully repaired.';
    } else if (action === 'drop') {
      if (options.uid) { if(!s.gear.some(g=>g.uid===options.uid)) return 'Equipment unavailable.'; }
      else if (!c.items[options.id] || !count(s,options.id)) return 'Item unavailable.';
      if (c.items[options.id]?.category === 'quest') return 'Quest items must be kept.';
    } else if (action === 'combat') {
      // The active encounter owns its available moves; location action lists do not.
    } else if (action === 'resolveEvent') {
      if (!hasCost(s,cost.cost)) return 'Missing supplies. Choose another response.';
    } else {
      if (!l.actions.includes(action) && action !== 'sleep') return 'Unavailable in this area.';
      if (action === 'sleep' && s.location !== 'camp') return 'Sleep at camp. You can rest here.';
      if (action === 'fire' && (!s.camp.firepit || !hasCost(s,{wood:2,fiber:s.camp.fire>0?0:1}))) return 'Build a fire ring. Lighting needs two wood and one fiber.';
      if (action === 'fire' && s.camp.fire > 720) return 'The fire already has plenty of fuel.';
      if(action==='fire'&&exposedToRain(s,c))return 'Rain puts out exposed fires. Build a fire canopy first.';
      if (l.requiresLight && ['explore','mine'].includes(action) && equipped(s,c,'tool')?.id !== 'torch') return 'Equip a torch to enter the cave.';
      if (action === 'mine' && !s.gear.some(g=>['axe','iron_axe'].includes(g.id) && g.durability>0)) return 'Carry a working axe to mine.';
      if (action === 'fish' && equipped(s,c,'tool')?.id !== 'fishing_rod') return 'Equip a fishing rod in the tool slot.';
      if (action === 'hunt' && !equipped(s,c,'weapon')) return 'Equip a spear or bow to hunt.';
      if (action === 'hunt' && equipped(s,c,'weapon')?.id === 'bow' && !count(s,'arrows')) return 'Your bow needs arrows.';
      if (action === 'setTrap' && !count(s,'trap')) return 'Craft a snare at camp.';
      if (action === 'setTrap' && s.traps.filter(t=>t.location===s.location).length>=3) return 'Three snares per area maximum.';
      if (action === 'checkTrap' && !s.traps.some(t=>t.location===s.location && s.time-t.time>=240)) return 'No snare ready. Return four hours after setting it.';
      if (action === 'signal') {
        if (!count(s,'radio')) return 'Build a rescue radio at camp.';
        if (isNight(s) || isNight({...s,time:s.time+cost.minutes}) || !['clear','cloudy'].includes(s.weather)) return 'Transmit in clear or cloudy daylight; finish before 19:00.';
        if (s.flags.rescued) return 'Signal received. Endless survival is unlocked.';
      }
    }
    return null;
  }
  perform(action, options = {}) {
    const denied=this.reason(action,options);
    if (denied) return { ok:false, message:denied };
    const s=this.state, c=this.content, l=c.locations[s.location], cost=this.actionCost(action,options);
    const route=action==='travel'?this.routeTo(options.id):null;
    const before={time:s.time,stats:{...s.stats},items:{...s.items},gear:s.gear.map(g=>({...g})),combat:s.combat?{...s.combat}:null,location:s.location};
    this.lastDawn=false;
    let message='', loot=null, generateEvent=false, tone='normal', battle=null,quality=null,lootReport={taken:{},left:{}},interrupted=false,refund=false;
    // Consume ingredients before producing results; advance metabolism before any healing.
    if (action === 'craft') spend(s,cost.cost);
    if (action === 'resolveEvent') spend(s,cost.cost);
    if (action === 'fire') { spend(s,{wood:2,fiber:s.camp.fire>0?0:1}); s.camp.fire=Math.min(960,s.camp.fire+360); }
    const timeResult=advanceAction(s,c,action,cost,route);
    if (!s.dead) {
      if (['gather','forage','mine'].includes(action)) {
        const yieldResult=gatherYield(s,c,action,l);loot=yieldResult.found;quality=yieldResult.quality;
        if (action==='mine') {
          const ax=s.gear.find(g=>['axe','iron_axe'].includes(g.id)&&g.durability>0); ax.durability=Math.max(0,ax.durability-4);
          if (!ax.durability && s.equipment.tool===ax.uid) s.equipment.tool=null;
        }
        if (wear(s,c,'tool',action==='forage'?1:3)) this.log('Your tool broke. Repair it at camp.','warning');
        s.skills.gathering++; message=({ gather:'Materials gathered.', forage:'Foraging complete.', mine:'Copper veins uncovered.' })[action]; generateEvent=true;
      } else if (action==='explore') {
        s.explored[s.location]=(s.explored[s.location]||0)+1;
        if (l.firstFind && !s.flags[l.firstFind]) { s.flags[l.firstFind]=true; loot={[l.firstFind]:1}; message=`Found ${c.items[l.firstFind].name.toLowerCase()}.`; tone='quest'; }
        else { const entry=Object.entries(l.loot)[this.range(0,Object.keys(l.loot).length-1)]; loot={[entry[0]]:this.range(...entry[1])}; message=`Explored ${l.name.toLowerCase()}.`; }
        if (l.requiresLight) wear(s,c,'tool',5);
        generateEvent=true;
      } else if (action==='travel') {
        s.location=options.id;
        for (const id of route.path) if (!s.visited.includes(id)) s.visited.push(id);
        s.counters.locationsVisited=s.visited.length;
        message=`Arrived at ${c.locations[s.location].name.toLowerCase()}.`;
        generateEvent=true;
      } else if (action==='craft') {
        if(cost.requiresFire&&timeResult.fireLostDuringAction){loot={...cost.cost};message='Rain stopped cooking. Uncooked ingredients returned.';tone='warning';interrupted=true;refund=true;}
        else {
        if (cost.structure) s.camp[cost.structure]=cost.level || true;
        else loot={[cost.item]:cost.quantity || 1};
        s.counters.crafted++; s.skills.crafting++;
        if (options.id==='water') s.counters.waterBoiled+=cost.quantity;
        if (cost.category==='cooking'&&options.id!=='water') s.counters.mealsCooked++;
        message=`Completed: ${cost.name.toLowerCase()}.`; tone='loot';
        }
      } else if (action==='fire') {
        s.counters.fires++;
        message=s.camp.fire>0?'Fire lit. Keep it covered before rain.':'Rain extinguished the exposed fire.'; tone='warm';
      } else if (action==='rest'||action==='sleep') message=action==='sleep'?'You wake from sleep.':'Rest complete.';
      else if (action==='water') { loot={dirty_water:3}; message='Three river-water bottles collected. Boil before drinking.'; }
      else if (action==='fish') {
        wear(s,c,'tool',3);
        if(this.random()<0.78) { const n=this.range(1,2); loot={fish:n}; s.counters.fishCaught+=n; message='Trout caught.'; }
        else message='The fish escaped.';
      } else if (action==='hunt') {
        const weapon=equipped(s,c,'weapon'); wear(s,c,'weapon',4); if(weapon.id==='bow')spend(s,{arrows:1});
        const chance=clamp(0.5+(weapon.hunt||0)+Math.min(0.12,s.skills.hunting*0.01)-(isNight(s)?0.14:0),0.2,0.92);
        s.skills.hunting++;
        if(this.random()<chance) { loot={raw_meat:this.range(1,2),hide:1}; s.counters.hunts++; message='Hunt successful.'; }
        else message='The animal escaped.';
        generateEvent=true;
      } else if (action==='setTrap') {
        spend(s,{trap:1}); s.traps.push({location:s.location,time:s.time}); message='Snare set. Return in four hours.';
      } else if (action==='checkTrap') {
        const index=s.traps.findIndex(t=>t.location===s.location&&s.time-t.time>=240); s.traps.splice(index,1);
        s.counters.trapsHarvested++;
        if(this.random()<.75){loot={raw_meat:this.range(1,2),hide:1};message='Catch field dressed. Craft another snare to reset it.';}
        else message='The snare was empty. Craft another to reset it.';
      } else if(action==='harvestCarcass'){
        loot=Object.fromEntries(cost.ids.map(id=>[id,s.carcass.loot[id]]));
        for(const id of cost.ids)delete s.carcass.loot[id];
        const tool=cuttingTool(s);tool.durability=Math.max(0,tool.durability-Math.ceil(cost.minutes/10));
        if(!tool.durability&&s.equipment.tool===tool.uid)s.equipment.tool=null;
        message='Carcass harvested. Cook raw meat before eating.';
        if(!Object.keys(s.carcass.loot).length)s.carcass=null;
      } else if(action==='leaveCarcass'){
        s.carcass=null;message='Carcass left behind.';
      } else if (action==='use') {
        const item=c.items[options.id]; spend(s,{[options.id]:1});
        for(const [key,value] of Object.entries({calories:item.calories||0,hydration:item.hydration||0,health:item.heal||0,injury:item.injury||0,sickness:item.sickness||0,temperature:item.warmth||0}))s.stats[key]+=value;
        if(item.risk&&this.random()<item.risk) { s.stats.sickness+=25; this.log('Raw food or water caused sickness. Treat with tea or medicine.','warning'); }
        normalizeStats(s);
        message=`Used ${item.name.toLowerCase()}.`;
        if(s.combat){battle=combatTurn(s,c,'item',()=>this.random());message+=' '+battle.messages.join(' ');}
      } else if (action==='equip') {
        const gear=s.gear.find(g=>g.uid===options.uid); const slot=c.items[gear.id].slot;
        s.equipment[slot]=s.equipment[slot]===gear.uid?null:gear.uid;
        message=`${c.items[gear.id].name} ${s.equipment[slot]?'equipped':'packed'}.`;
      } else if (action==='repair') {
        spend(s,{scrap:1,fiber:2}); const gear=s.gear.find(g=>g.uid===options.uid);
        gear.durability=Math.min(c.items[gear.id].durability,gear.durability+40); message='Equipment repaired: up to +40 durability.';
      } else if (action==='drop') {
        if(options.uid) { const gear=s.gear.find(g=>g.uid===options.uid); const slot=c.items[gear.id].slot; if(s.equipment[slot]===gear.uid)s.equipment[slot]=null; s.gear=s.gear.filter(g=>g.uid!==options.uid); }
        else spend(s,{[options.id]:Math.min(count(s,options.id),Math.max(1,Math.floor(Number(options.quantity)||1)))});
        message='Item dropped.';
      } else if (action==='resolveEvent') {
        const event=c.events[s.event]; s.lastEvent=s.event; s.event=null;
        if(!cost.chance || this.random()<cost.chance)loot=cost.loot;
        else this.log(cost.failure || 'Nothing found.','warning');
        if(cost.risk&&this.random()<cost.risk)s.stats.injury+=cost.injury || 10;
        s.stats.health+=cost.heal||0; s.stats.stamina+=cost.restore||0; s.stats.fatigue+=cost.fatigue||0; s.stats.temperature+=cost.warmth||0;
        if(cost.combat)beginCombat(s,c,cost.combat);
        message=`${event.title}: ${cost.label.toLowerCase()}.`;
      } else if (action==='combat') {
        const outcome=combatTurn(s,c,options.move,()=>this.random());
        battle=outcome;
        message=outcome.messages.join(' ');
        if(outcome.victory) {
          s.counters.battlesWon++;tone='loot';
          const profile=outcome.enemy.harvest;
          s.carcass={id:before.combat.id,location:s.location,time:s.time,expires:s.time+profile.freshMinutes,loot:Object.fromEntries(Object.entries(profile.yields).map(([id,limits])=>[id,this.range(...limits)]))};
          message=`${outcome.enemy.name} defeated. A fresh carcass remains.`;
        }
      } else if (action==='signal') {
        if(!['clear','cloudy'].includes(s.weather)||timeResult.weatherChanges.some(w=>!['clear','cloudy'].includes(w.id))){interrupted=true;message='Poor weather interrupted the signal. Try again in calm daylight.';tone='warning';}
        else {s.flags.rescued=true; message='Signal received. Rescue is on its way.'; tone='quest';}
      }
      if(loot) { const result=this.loot(loot,{force:refund});lootReport=result; if(action==='mine')s.counters.oreMined+=result.taken.ore||0; if(action==='water')message=`${result.taken.dirty_water||0} river-water bottles packed. Boil before drinking.`; }
    }
    s.counters.actions++;
    normalizeStats(s);
    if(message)this.log(message,tone);
    if(timeResult.dawns&&!s.dead) { this.dawn(timeResult.passiveLoot); this.lastDawn=true; }
    this.discover();
    const quests=s.dead?[]:updateQuests(s,c,reward=>this.loot(reward,{force:true}));
    for(const quest of quests)this.log(`Quest complete: ${quest.title}. Rewards added to your pack.`,'quest');
    const notes=timeResult.weatherChanges.map(change=>`Weather changed to ${c.weather[change.id].name.toLowerCase()}.`);
    if(timeResult.fireExtinguished)notes.push('Rain extinguished the exposed campfire. A sleeping shelter does not cover the fire.');
    notes.forEach(note=>this.log(note,'weather'));
    if(generateEvent && !s.dead && !s.combat && !s.carcass && s.counters.actions>3)this.encounter();
    if(s.dead) { s.event=null; s.combat=null;s.carcass=null; this.log('The ember fades. Your journey ends.','danger'); }
    const gained={};
    for(const [id,n] of Object.entries(s.items)){const diff=n-(before.items[id]||0);if(diff>0)gained[id]=diff;}
    for(const gear of s.gear)if(!before.gear.some(g=>g.uid===gear.uid))gained[gear.id]=(gained[gear.id]||0)+1;
    this.lastResult={ok:true,message:message || 'Action complete.',quests:quests.map(q=>q.id),dead:s.dead,dawn:this.lastDawn,notes,quality,interrupted,effects:{minutes:s.time-before.time,stats:Object.fromEntries(Object.entries(s.stats).map(([k,v])=>[k,v-before.stats[k]])),gained,left:lootReport.left,battle:battle?{id:before.combat?.id,damageDealt:battle.damageDealt,damageTaken:battle.damageTaken,victory:battle.victory,fled:battle.fled,summary:before.combat?.startingStats?{minutes:s.time-before.combat.startedAt,stats:Object.fromEntries(Object.entries(s.stats).map(([k,v])=>[k,v-before.combat.startingStats[k]]))}:null}:null}};
    const showReceipt=!['equip','drop','use','leaveCarcass'].includes(action)&&(!battle||battle.victory||battle.fled);
    s.receipt=!s.dead&&showReceipt?{kind:action,options:{...options},...structuredClone(this.lastResult)}:null;
    return this.lastResult;
  }
  dawn(passiveLoot) {
    const s=this.state;
    // Production uses the weather and structures present at dawn, not the end of sleep.
    if(Object.keys(passiveLoot).length)this.loot(passiveLoot,{force:true});
    this.log(`Dawn, day ${dayOf(s)}. The valley grows harsher.`,'story');
  }
  encounter() {
    const s=this.state, c=this.content;
    if(this.random()<this.danger()) {
      const choices=Object.keys(c.enemies).filter(id=>!c.enemies[id].minDay||dayOf(s)>=c.enemies[id].minDay);
      beginCombat(s,c,choices[this.range(0,choices.length-1)]); this.log('Wildlife blocks your path.','danger'); return;
    }
    if(this.random()<0.19) {
      const choices=Object.keys(c.events).filter(id=>id!==s.lastEvent && c.events[id].locations.includes(s.location) && (!c.events[id].minDay||dayOf(s)>=c.events[id].minDay));
      if(choices.length)s.event=choices[this.range(0,choices.length-1)];
    }
  }
  status() { return { day:dayOf(this.state), temperature:ambient(this.state,this.content), weight:weight(this.state,this.content), capacity:capacity(this.state), danger:this.danger() }; }
}
