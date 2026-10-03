import { equipped } from './inventory.js';
import { range } from './random.js';

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const dayOf = state => Math.floor(state.time / 1440) + 1;
export const hourOf = state => Math.floor((state.time % 1440) / 60);
export const isNight = state => hourOf(state) < 6 || hourOf(state) >= 19;
export const clockText = state => `${String(hourOf(state)).padStart(2, '0')}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`;
export const difficultyFactor = state => state.tutorial?.active ? 0.6 : ({ story: 0.72, survivor: 1, relentless: 1.28 }[state.difficulty] || 1);
export const exertionCost = (state, content, stamina = 0) => stamina * (content.weather[state.weather]?.stamina || 1) * (1 + state.stats.injury / 180);
export const fireBurnRate = () => 1;
export const exposedToRain = (state,content) => !!content.weather[state.weather]?.wet && !state.camp.fire_cover;
export function extinguishFire(state,content) {
  if(state.camp.fire>0&&exposedToRain(state,content)){state.camp.fire=0;return true;}
  return false;
}
function advanceWeather(state,content,changes) {
  if(state.time<state.nextWeather)return false;
  const eligible=Object.keys(content.weather).filter(id=>!content.weather[id].minDay||dayOf(state)>=content.weather[id].minDay);
  const next=eligible[range(state,0,eligible.length-1)];
  if(next!==state.weather)changes.push({id:next,time:state.time});
  state.weather=next;state.nextWeather=state.time+range(state,180,360);
  return extinguishFire(state,content);
}
export function ambient(state, content) {
  const location = content.locations[state.location];
  return (location?.temperature ?? 14) + (content.weather[state.weather]?.temp || 0)
    - (isNight(state) ? 7 : 0) - Math.min(7, (dayOf(state) - 1) * 0.22);
}
export function normalizeStats(state) {
  for (const key of ['health', 'stamina', 'fatigue', 'injury', 'sickness']) state.stats[key] = clamp(state.stats[key], 0, 100);
  state.stats.calories = clamp(state.stats.calories, 0, 2800);
  state.stats.hydration = clamp(state.stats.hydration, 0, 2500);
  state.stats.temperature = clamp(state.stats.temperature, 31, 40);
  if (state.stats.health <= 0) state.dead = true;
}
export function advanceTime(state, content, minutes, stamina, { resting = false, sleeping = false, travelling = false } = {}) {
  const stat = state.stats;
  const factor = difficultyFactor(state);
  const exertion = exertionCost(state, content, stamina);
  stat.stamina -= exertion;
  stat.calories -= exertion * 5.5 * factor;
  stat.hydration -= exertion * 7 * factor;
  let remaining = minutes;
  let dawns = 0;
  const weatherChanges=[];
  const passiveLoot={};
  let fireExtinguished=extinguishFire(state,content),fireLostDuringAction=false;
  while (remaining > 0) {
    if(advanceWeather(state,content,weatherChanges)){fireExtinguished=true;fireLostDuringAction=true;}
    // Split at fuel expiry and weather boundaries. Rain affects the remaining action.
    const burnRate = fireBurnRate(state, content);
    const step = Math.min(15, remaining, state.nextWeather-state.time, state.camp.fire > 0 ? state.camp.fire / burnRate : Infinity);
    const hours = step / 60;
    const before = state.time;
    state.time += step;
    if (Math.floor((before - 360) / 1440) < Math.floor((state.time - 360) / 1440)) {
      dawns++;
      if(state.camp.rain_collector&&content.weather[state.weather]?.wet)passiveLoot.water=(passiveLoot.water||0)+2;
      if(state.camp.garden){passiveLoot.berries=(passiveLoot.berries||0)+2;passiveLoot.herbs=(passiveLoot.herbs||0)+1;}
    }
    const home = state.location === 'camp' && !travelling;
    const sheltered = home && state.camp.shelter > 0;
    const lit = home && state.camp.fire > 0;
    const clothing = equipped(state, content, 'clothing');
    const protection = (clothing?.warmth || 0) + (sheltered ? 7 + state.camp.shelter * 3 : 0) + (lit ? 16 : 0);
    const effective = ambient(state, content) + protection - (content.weather[state.weather]?.wet && !sheltered ? 4 : 0);
    const target = effective < 12 ? 36.8 - (12 - effective) * 0.15 : 36.85;
    stat.temperature += clamp(target - stat.temperature, -0.5, 0.35) * hours * factor;
    const dailyPressure = 1 + Math.min(0.4, (dayOf(state) - 1) * 0.012);
    stat.calories -= (sleeping ? 65 : resting ? 85 : 105) * hours * factor * dailyPressure;
    stat.hydration -= (sleeping ? 75 : 105) * hours * factor * dailyPressure;
    if (sleeping || resting) {
      const quality = sleeping ? (sheltered ? 1 + state.camp.shelter * 0.15 : 0.45) : 1;
      stat.stamina += (sleeping ? 15 : 24) * hours * quality;
      stat.fatigue -= (sleeping ? 13 : 10) * hours * quality;
      if (stat.calories > 500 && stat.hydration > 400 && stat.temperature > 35.7) {
        stat.health += (sleeping ? 3 : 1.5) * hours;
        stat.injury -= 0.8 * hours;
        stat.sickness -= 0.4 * hours;
      }
    } else stat.fatigue += 2.2 * hours;
    if (stat.calories <= 0) stat.health -= 6 * hours * factor;
    if (stat.hydration <= 0) stat.health -= 10 * hours * factor;
    if (stat.temperature < 35.3) stat.health -= (35.3 - stat.temperature) * 5 * hours;
    if (stat.fatigue > 88) { stat.stamina -= 4 * hours; stat.health -= 1.5 * hours; }
    stat.health -= stat.sickness * 0.028 * hours + stat.injury * 0.016 * hours;
    // An outdoor canopy, rather than the survivor's sleeping shelter, covers the fire.
    state.camp.fire = Math.max(0, state.camp.fire - step * burnRate);
    normalizeStats(state);
    remaining -= step;
    if (state.dead) break;
  }
  state.counters.minutesSurvived = Math.max(0, state.time - state.startTime);
  if(advanceWeather(state,content,weatherChanges))fireExtinguished=true;
  return { dawns, weatherChanges, fireExtinguished, fireLostDuringAction, exertion,passiveLoot };
}

export function advanceAction(state, content, action, cost, route = null) {
  if (action !== 'travel') return advanceTime(state, content, cost.minutes || 0, cost.stamina || 0, { resting:action === 'rest', sleeping:action === 'sleep' });
  let dawns = 0,fireExtinguished=false,fireLostDuringAction=false,exertion=0;
  const weatherChanges=[];
  const passiveLoot={};
  for (let i = 1; i < route.path.length; i++) {
    const from = route.path[i - 1], to = route.path[i];
    const minutes = to === 'camp' ? content.locations[from].travel || 25 : content.locations[to].travel;
    // Each leg exposes the survivor to that leg's environment, never the camp roof.
    state.location = to;
    const result = advanceTime(state, content, minutes, cost.stamina * minutes / route.minutes, { travelling:true });
    dawns += result.dawns;
    exertion += result.exertion;
    weatherChanges.push(...result.weatherChanges);
    for(const [id,n] of Object.entries(result.passiveLoot))passiveLoot[id]=(passiveLoot[id]||0)+n;
    fireExtinguished ||= result.fireExtinguished;
    fireLostDuringAction ||= result.fireLostDuringAction;
    if (state.dead) break;
  }
  return { dawns,weatherChanges,fireExtinguished,fireLostDuringAction,exertion,passiveLoot };
}
