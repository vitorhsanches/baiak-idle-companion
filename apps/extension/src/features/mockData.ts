import type { GameSnapshot } from '@companion/game-adapter';

export const mockSnapshot: GameSnapshot = {
  character: {
    id: 'char-1', name: 'Aegis Knight', vocation: 'Elite Knight', level: 425, talentPoints: 18,
    equipment: [
      { slot: 'Helmet', name: 'Falcon Coif', imbuements: ['Void III'] },
      { slot: 'Armor', name: 'Lion Plate', imbuements: ['Vampirism III'] },
      { slot: 'Weapon', name: 'Soulshredder', imbuements: ['Strike III', 'Vampirism III'] }
    ]
  },
  hunts: [
    { id: 'h1', name: 'Winter Court', minimumLevel: 350, estimatedXpHour: 5800000, estimatedGoldHour: 520000, relevantResistance: 'ice', compatibility: 94, monsters: [] },
    { id: 'h2', name: 'Asura Mirror', minimumLevel: 300, estimatedXpHour: 4700000, estimatedGoldHour: 610000, relevantResistance: 'death', compatibility: 86, monsters: [] },
    { id: 'h3', name: 'Cobra Bastion', minimumLevel: 450, estimatedXpHour: 6900000, estimatedGoldHour: 720000, relevantResistance: 'earth', compatibility: 62, monsters: [] }
  ],
  inventory: [
    { id: 'i1', name: 'Ultimate Health Potion', quantity: 138, rarity: 'common', classification: 'supply' },
    { id: 'i2', name: 'Cobra Axe', quantity: 1, rarity: 'epic', classification: 'protect' },
    { id: 'i3', name: 'Platinum Coin', quantity: 76, rarity: 'common', classification: 'sellable' },
    { id: 'i4', name: 'Mysterious Relic', quantity: 2, rarity: 'rare', classification: 'review' }
  ],
  combat: {
    durationSeconds: 1320, totalDamage: 28400000, dps: 21515, xpHour: 5700000, goldHour: 515000,
    byCharacter: [{ label: 'Aegis Knight', value: 71, color: '#db9e3f' }, { label: 'Lyra Druid', value: 29, color: '#5fc6af' }],
    byElement: [{ label: 'Physical', value: 54, color: '#9ba5b4' }, { label: 'Ice', value: 31, color: '#55aee8' }, { label: 'Earth', value: 15, color: '#6ebc70' }]
  }
};

export const validateMockSnapshot = (data: GameSnapshot): boolean =>
  data.character.level > 0 &&
  data.hunts.every((hunt) => hunt.compatibility >= 0 && hunt.compatibility <= 100) &&
  data.inventory.every((item) => item.quantity >= 0) &&
  data.combat.durationSeconds > 0;
