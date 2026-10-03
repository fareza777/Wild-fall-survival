import { count } from './inventory.js';
import { dayOf } from './survival.js';

export function conditionProgress(state, condition) {
  if (condition.flag) return { current: state.flags[condition.flag] ? 1 : 0, target: 1 };
  if (condition.visited) return { current: state.visited.includes(condition.visited) ? 1 : 0, target: 1 };
  if (condition.day) return { current: dayOf(state), target: condition.day };
  if (condition.structure) return { current: Number(state.camp[condition.structure]) || 0, target: condition.value };
  if (condition.item) return { current: count(state, condition.item), target: condition.value };
  return { current: state.counters[condition.counter] || 0, target: condition.value };
}
export function questProgress(state, quest) {
  const checks = quest.conditions.map(c => conditionProgress(state, c));
  return { complete: checks.every(p => p.current >= p.target), fraction: checks.reduce((sum, p) => sum + Math.min(1, p.current / p.target), 0) / checks.length, checks };
}
export function activeMain(state, content) { return content.quests.main.find(q => !state.quests.completed.includes(q.id)) || null; }
export function questRevealed(state,content,quest){
  if(state.quests.completed.includes(quest.id))return true;
  if(content.quests.main.includes(quest))return activeMain(state,content)?.id===quest.id;
  return (quest.unlock||[]).every(condition=>{const p=conditionProgress(state,condition);return p.current>=p.target;});
}
export function revealedQuests(state,content,group='main'){return content.quests[group].filter(q=>questRevealed(state,content,q));}
export function updateQuests(state, content, reward) {
  const completed = [];
  for (const quest of [...content.quests.main, ...content.quests.side]) {
    if (state.quests.completed.includes(quest.id)) continue;
    if (!questRevealed(state,content,quest)) continue;
    if (questProgress(state, quest).complete) {
      state.quests.completed.push(quest.id);
      reward(quest.reward);
      completed.push(quest);
    }
  }
  return completed;
}
