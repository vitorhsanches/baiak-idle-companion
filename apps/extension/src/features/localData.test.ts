import { classifyItem, defaults, localDataStore } from './localData';

describe('local data', () => {
  it('initializes a versioned local schema and exports it', async () => { expect((await localDataStore.load()).version).toBe(1); expect(JSON.parse(await localDataStore.export()).formatVersion).toBe(1); });
  it('rejects a corrupt backup without replacing stored data', async () => { await expect(localDataStore.import('{')).rejects.toThrow(); expect((await localDataStore.load()).version).toBe(1); });
  it('protects equipped, manual and unknown items before sell rules', () => {
    const item = { id: 'a', name: 'Unknown', quantity: 1, rarity: 'common' as const, classification: 'unknown' as const, equipped: true };
    expect(classifyItem(item, [], {}).classification).toBe('protected');
    expect(classifyItem({ ...item, equipped: false }, [{ id: 'sell', enabled: true, kind: 'rarity', value: 'common', classification: 'sell-candidate' }], {}).classification).toBe('unknown');
    expect(classifyItem({ ...item, equipped: false }, [], { a: 'protected' }).reason).toBe('Proteção manual');
  });
  it('can reset the complete local state', async () => { await localDataStore.save({ ...defaults(), overrides: { x: 'protected' } }); await localDataStore.clear(); expect((await localDataStore.load()).overrides).toEqual({}); });
});
