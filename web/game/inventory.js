export const count = (state, id) => state.items[id] || 0;
export function capacity(state) { return count(state, 'backpack') ? 23 : 14; }
export function weight(state, content) {
  return Object.entries(state.items).reduce((sum, [id, n]) => sum + (content.items[id]?.weight || 0) * n, 0)
    + state.gear.reduce((sum, g) => sum + (content.items[g.id]?.weight || 0), 0);
}
export function hasCost(state, cost = {}) { return Object.entries(cost).every(([id, n]) => count(state, id) >= n); }
export function spend(state, cost = {}) {
  for (const [id, n] of Object.entries(cost)) { state.items[id] -= n; if (!state.items[id]) delete state.items[id]; }
}
export function equipped(state, content, slot) {
  const gear = state.gear.find(g => g.uid === state.equipment[slot] && g.durability > 0);
  return gear ? { ...content.items[gear.id], ...gear } : null;
}
export function wear(state, content, slot, amount = 1) {
  const gear = state.gear.find(g => g.uid === state.equipment[slot]);
  if (!gear) return false;
  gear.durability = Math.max(0, gear.durability - amount);
  if (!gear.durability) { state.equipment[slot] = null; return true; }
  return false;
}
export function addLoot(state, content, loot, { force = false, origin='found' } = {}) {
  const taken = {}, left = {};
  for (const [id, n] of Object.entries(loot)) {
    const item = content.items[id];
    if (!item) continue;
    for (let i = 0; i < n; i++) {
      const canTake = force || item.category === 'quest' || weight(state, content) + item.weight <= capacity(state) + 0.001;
      if (!canTake) { left[id] = (left[id] || 0) + 1; continue; }
      if (item.category === 'gear') state.gear.push({ id, uid: `${id}-${state.nextGear++}`, durability: item.durability,origin,uses:0 });
      else state.items[id] = count(state, id) + 1;
      taken[id] = (taken[id] || 0) + 1;
    }
  }
  return { taken, left };
}
