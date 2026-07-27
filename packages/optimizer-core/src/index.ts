import type { DamageProfile, Element, Hunt, HuntRecommendation, ServerMultipliers } from '@companion/domain';
export const effectiveDamageMultiplier = (resistance: number | undefined): number => Math.max(0, 1 - (resistance ?? 0) / 100);
export const effectiveHitPoints = (hitPoints: number, resistance: number | undefined): number => { const multiplier = effectiveDamageMultiplier(resistance); return multiplier > 0 ? hitPoints / multiplier : Infinity; };
export const lootCoverage = (hunt: Hunt): 'complete' | 'partial' | 'unavailable' => { const count = hunt.monsters.length; const known = hunt.monsters.filter((m) => m.loot?.some((l) => l.value !== undefined)).length; return known === 0 ? 'unavailable' : known === count ? 'complete' : 'partial'; };
export const theoreticalKillsPerHour = (respawnSeconds: number | undefined, monsters = 1): number | undefined => respawnSeconds && respawnSeconds > 0 ? Math.floor((3600 / respawnSeconds) * monsters) : undefined;
export const recommendHunts = (level: number, profile: DamageProfile, hunts: Hunt[], multipliers: ServerMultipliers = { experience: 1, gold: 1 }): HuntRecommendation[] => hunts.map((hunt): HuntRecommendation => {
  const missing: string[] = []; if (!hunt.monsters.length) missing.push('monstros');
  const compatible = level >= hunt.minimumLevel && (hunt.maximumLevel === undefined || level <= hunt.maximumLevel);
  const multiplier = hunt.monsters.length ? hunt.monsters.reduce((sum, monster) => sum + Object.entries(profile.elements).reduce((damage, [element, share]) => damage + (share ?? 0) * effectiveDamageMultiplier(monster.resistances[element as Element]), 0), 0) / hunt.monsters.length : 0;
  if (!compatible) missing.push('level compatível'); if (!multiplier) missing.push('perfil de dano');
  const value = compatible ? hunt.estimatedXpHour * multipliers.experience : 0;
  return { huntId: hunt.id, huntName: hunt.name, value, unit: 'XP/h', explanation: compatible ? `Estimativa baseada no catálogo; multiplicador elemental efetivo ${Math.round(multiplier * 100)}%.` : 'Level fora da faixa do catálogo.', confidence: missing.length ? 'low' : 'medium', source: 'inferred', missingFields: missing, limitations: ['Não é resultado medido; teto de respawn é teórico.'], kind: missing.length ? 'unavailable' : 'estimated' };
}).sort((a, b) => b.value - a.value);
