import type { Character, Hunt } from '@companion/domain';

export const levelCompatibility = (character: Character, hunt: Hunt): number => {
  if (character.level < hunt.minimumLevel) return 0;
  return Math.min(100, hunt.compatibility + Math.floor((character.level - hunt.minimumLevel) / 20));
};

export const rankHunts = (character: Character, hunts: Hunt[]): Hunt[] =>
  [...hunts].sort((a, b) => levelCompatibility(character, b) - levelCompatibility(character, a));
