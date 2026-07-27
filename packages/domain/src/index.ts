/** Product language only: this package never reads browser or game state. */
export type Element = 'physical' | 'fire' | 'ice' | 'earth' | 'energy' | 'holy' | 'death';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type DataSource = 'real' | 'inferred' | 'demo' | 'unavailable';
export type DataConfidence = 'high' | 'medium' | 'low' | 'none';
export type DataUnavailableReason = 'not-found' | 'invalid-format' | 'not-logged-in' | 'dom-changed' | 'not-supported';
export type CharacterClass = string;
export type CharacterLevel = number;
export type EquipmentSlot = 'helmet' | 'armor' | 'weapon' | 'shield' | 'legs' | 'boots' | 'ring' | 'amulet' | 'unknown';
export type InventoryClassification = 'protected' | 'supply' | 'review' | 'sell-candidate' | 'unknown' | 'protect' | 'sellable';
export interface Imbuement { name: string; tier?: number; }
export interface EquipmentItem { slot: EquipmentSlot; name: string; imbuements: Imbuement[]; }
export interface TalentSummary { visiblePoints: number; }
export interface CurrentHuntSummary { name: string; }
export interface CharacterSnapshot {
  name?: string; vocation?: CharacterClass; level?: CharacterLevel; equipment: EquipmentItem[];
  talents?: TalentSummary; currentHunt?: CurrentHuntSummary; readAt: string; source: DataSource;
  confidence: DataConfidence; unavailableFields: string[]; parsingErrors: string[];
}
/* Legacy presentation shapes retained while the extension migrates. */
export interface Equipment { slot: string; name: string; imbuements: string[]; }
export interface Character { id: string; name: string; vocation: string; level: number; talentPoints: number; equipment: Equipment[]; }
export interface InventoryItem { id: string; name: string; quantity: number; rarity: Rarity; classification: InventoryClassification; category?: string; value?: number; equipped?: boolean; favorite?: boolean; }
export type ResistanceMap = Partial<Record<Element, number>>;
export interface DamageProfile { elements: Partial<Record<Element, number>>; }
export interface LootEntry { itemId: string; chance?: number; value?: number; }
export interface Monster { id: string; name: string; hitPoints?: number; experience?: number; respawnSeconds?: number; resistances: ResistanceMap; damage: DamageProfile; loot?: LootEntry[]; }
export interface Hunt { id: string; name: string; minimumLevel: number; maximumLevel?: number; estimatedXpHour: number; estimatedGoldHour: number; relevantResistance: Element; compatibility: number; monsters: Monster[]; }
export interface Boss { id: string; name: string; monsters: string[]; }
export interface ServerMultipliers { experience: number; gold: number; }
export type RecommendationConfidence = DataConfidence;
export type CalculationCoverage = 'complete' | 'partial' | 'unavailable';
export interface HuntRecommendation { huntId: string; huntName: string; value: number; unit: string; explanation: string; confidence: RecommendationConfidence; source: DataSource; missingFields: string[]; limitations: string[]; kind: 'estimated' | 'theoretical-ceiling' | 'unavailable'; }
export interface DamageSlice { label: string; value: number; color: string; }
export interface CombatSession { durationSeconds: number; totalDamage: number; dps: number; xpHour: number; goldHour: number; byCharacter: DamageSlice[]; byElement: DamageSlice[]; }
export interface Recommendation { id: string; title: string; rationale: string; confidence: number; }
export const isValidLevel = (level: number): boolean => Number.isInteger(level) && level > 0;
export const calculateDps = (damage: number, seconds: number): number => seconds > 0 ? Math.round(damage / seconds) : 0;
