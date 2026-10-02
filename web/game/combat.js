import { count, spend, equipped, wear } from './inventory.js';
import { dayOf, difficultyFactor, normalizeStats } from './survival.js';

export function beginCombat(state, content, enemyId) {
  const enemy = content.enemies[enemyId];
  if (!enemy) return;
  const scale = 1 + Math.min(0.8, (dayOf(state) - 1) * 0.025);
  state.combat = { id: enemyId, health: Math.round(enemy.health * scale), maxHealth: Math.round(enemy.health * scale), turn: 0, stunned: false, messages: [`${enemy.name} blocks your path.`] };
}
export function combatTurn(state, content, move, random) {
  const fight = state.combat;
  const enemy = content.enemies[fight.id];
  const weapon = equipped(state, content, 'weapon');
  const tool = equipped(state, content, 'tool');
  const armor = equipped(state, content, 'clothing')?.armor || 0;
  const messages = [];
  fight.turn++;
  let victory = false, fled = false, damageDealt = 0, damageTaken = 0;
  if (move === 'flee') {
    if (random() > enemy.speed + (state.stats.fatigue > 70 ? 0.12 : 0)) { fled = true; messages.push('You escaped.'); }
    else messages.push('Escape failed.');
  } else if (move === 'attack' || move === 'power') {
    const bowReady = weapon?.id !== 'bow' || count(state, 'arrows') > 0;
    const damage = (bowReady && weapon ? weapon.damage : tool?.damage || 4) + Math.floor(random() * 5);
    const finalDamage = move === 'power' ? Math.round(damage * 1.5) : damage;
    damageDealt = Math.min(fight.health,finalDamage);
    fight.health = Math.max(0, fight.health - finalDamage);
    if (weapon && bowReady) { wear(state, content, 'weapon', move === 'power' ? 4 : 2); if (weapon.id === 'bow') spend(state, { arrows: 1 }); }
    else if (tool) wear(state, content, 'tool', 2);
    messages.push(`You strike for ${damageDealt} damage${weapon?.id === 'bow' && !bowReady ? ' (no arrows; using your backup)' : ''}.`);
    victory = fight.health <= 0;
  } else if (move === 'defend') { state.stats.stamina += 8; messages.push('You guard and recover up to eight stamina.'); }
  else messages.push('You use supplies as the enemy closes in.');
  if (!victory && !fled) {
    const scale = 1 + Math.min(0.6, (dayOf(state) - 1) * 0.02);
    const raw = Math.round(enemy.damage * scale * difficultyFactor(state)) + Math.floor(random() * 4);
    const damage = Math.max(1, Math.round((raw - armor) * (move === 'defend' ? 0.35 : move === 'power' ? 1.15 : 1)));
    damageTaken = Math.min(state.stats.health,damage);
    state.stats.health -= damage;
    if (random() < 0.2 && move !== 'defend') state.stats.injury += 8;
    if (armor) wear(state, content, 'clothing', 1);
    messages.push(`${enemy.name} strikes: −${damageTaken} health.`);
  }
  normalizeStats(state);
  fight.messages = [...fight.messages, ...messages].slice(-6);
  if (victory || fled || state.dead) state.combat = null;
  return { victory, fled, enemy, messages, damageDealt, damageTaken };
}
