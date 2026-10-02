import { count } from './inventory.js';
import { dayOf } from './survival.js';

export function conditionProgress(state, condition) {
  if (condition.flag) return { current: state.flags[condition.flag] ? 1 : 0, target: 1 };
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
export function updateQuests(state, content, reward) {
  const completed = [];
  for (const quest of [...content.quests.main, ...content.quests.side]) {
    if (state.quests.completed.includes(quest.id)) continue;
    const main = content.quests.main.includes(quest);
    if (main && activeMain(state, content)?.id !== quest.id) continue;
    if (questProgress(state, quest).complete) {
      state.quests.completed.push(quest.id);
      reward(quest.reward);
      completed.push(quest);
    }
  }
  return completed;
}
