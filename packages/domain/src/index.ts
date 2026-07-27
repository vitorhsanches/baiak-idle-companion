export type Element = 'physical' | 'fire' | 'ice' | 'earth' | 'energy' | 'holy' | 'death';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type InventoryClassification = 'protect' | 'review' | 'sellable' | 'supply';

export interface Equipment {
  slot: string;
  name: string;
  imbuements: string[];
}
export interface Character {
  id: string;
  name: string;
  vocation: string;
  level: number;
  talentPoints: number;
  equipment: Equipment[];
}
export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  rarity: Rarity;
  classification: InventoryClassification;
}
export interface Monster {
  id: string;
  name: string;
  resistances: Partial<Record<Element, number>>;
}
export interface Hunt {
  id: string;
  name: string;
  minimumLevel: number;
  estimatedXpHour: number;
  estimatedGoldHour: number;
  relevantResistance: Element;
  compatibility: number;
  monsters: Monster[];
}
export interface DamageSlice {
  label: string;
  value: number;
  color: string;
}
export interface CombatSession {
  durationSeconds: number;
  totalDamage: number;
  dps: number;
  xpHour: number;
  goldHour: number;
  byCharacter: DamageSlice[];
  byElement: DamageSlice[];
}
export interface Recommendation {
  id: string;
  title: string;
  rationale: string;
  confidence: number;
}

export const isValidLevel = (level: number): boolean => Number.isInteger(level) && level > 0;
export const calculateDps = (damage: number, seconds: number): number =>
  seconds > 0 ? Math.round(damage / seconds) : 0;
