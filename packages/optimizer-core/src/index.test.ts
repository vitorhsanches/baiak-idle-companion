import { effectiveDamageMultiplier, effectiveHitPoints, lootCoverage, recommendHunts, theoreticalKillsPerHour } from './index';
import type { Hunt } from '@companion/domain';
const hunt: Hunt = { id: 'h', name: 'H', minimumLevel: 10, estimatedXpHour: 100, estimatedGoldHour: 10, relevantResistance: 'fire', compatibility: 50, monsters: [{ id: 'm', name: 'M', hitPoints: 100, resistances: { fire: 20 }, damage: { elements: {} }, loot: [{ itemId: 'i', value: 1 }] }] };
describe('optimizer', () => {
  it('uses explicit resistance convention', () => { expect(effectiveDamageMultiplier(20)).toBe(.8); expect(effectiveDamageMultiplier(-20)).toBe(1.2); expect(effectiveHitPoints(100, 20)).toBe(125); });
  it('reports coverage, level incompatibility and respawn ceiling', () => { expect(lootCoverage(hunt)).toBe('complete'); expect(theoreticalKillsPerHour(60, 2)).toBe(120); expect(recommendHunts(1, { elements: { fire: 1 } }, [hunt])[0]?.kind).toBe('unavailable'); });
});
