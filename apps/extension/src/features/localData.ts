import type { DamageProfile, InventoryClassification, InventoryItem } from '@companion/domain';
import type { ImportedCatalog } from './catalogs';

export type LocalOrigin = 'demo' | 'manual' | 'imported' | 'unavailable';
export interface InventoryRule { id: string; enabled: boolean; kind: 'exact-name' | 'rarity' | 'manual-protect'; value: string; classification: InventoryClassification; }
export interface LocalRecord { id: string; createdAt: string; origin: LocalOrigin; confidence: string; warnings: string[]; payload: unknown; }
export interface LocalData { version: 1; catalog?: ImportedCatalog; catalogHistory: ImportedCatalog[]; damageProfile: DamageProfile; damageOrigin: LocalOrigin; inventoryRules: InventoryRule[]; overrides: Record<string, InventoryClassification>; snapshots: LocalRecord[]; recommendations: LocalRecord[]; }
export const defaultProfile: DamageProfile = { elements: { physical: 1 } };
export const defaultRules: InventoryRule[] = [{ id: 'protect-rare', enabled: true, kind: 'rarity', value: 'epic', classification: 'protected' }, { id: 'supply-potion', enabled: true, kind: 'exact-name', value: 'Ultimate Health Potion', classification: 'supply' }];
export const defaults = (): LocalData => ({ version: 1, catalogHistory: [], damageProfile: defaultProfile, damageOrigin: 'demo', inventoryRules: defaultRules, overrides: {}, snapshots: [], recommendations: [] });
const key = 'companion.local-data.v1';
let memoryFallback: LocalData | undefined;
const get = async (): Promise<unknown> => globalThis.chrome?.storage?.local ? (await chrome.storage.local.get(key))[key] : memoryFallback;
const set = async (value: LocalData): Promise<void> => { if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ [key]: value }); else memoryFallback = structuredClone(value); };
const parse = (value: unknown): LocalData => { try { const raw = typeof value === 'string' ? JSON.parse(value) : value; if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) return defaults(); const item = raw as Partial<LocalData>; return { ...defaults(), ...item, catalogHistory: Array.isArray(item.catalogHistory) ? item.catalogHistory : [], inventoryRules: Array.isArray(item.inventoryRules) ? item.inventoryRules : defaultRules, overrides: item.overrides && typeof item.overrides === 'object' ? item.overrides : {} }; } catch { return defaults(); } };
export const localDataStore = {
  async load(): Promise<LocalData> { return parse(await get()); },
  async save(data: LocalData): Promise<void> { await set({ ...data, version: 1 }); },
  async update(change: (data: LocalData) => LocalData): Promise<LocalData> { const next = change(await this.load()); await this.save(next); return next; },
  async clear(): Promise<void> { await set(defaults()); },
  async export(): Promise<string> { return JSON.stringify({ formatVersion: 1, exportedAt: new Date().toISOString(), data: await this.load() }, null, 2); },
  async import(text: string): Promise<LocalData> { const raw = JSON.parse(text) as { formatVersion?: unknown; data?: unknown }; if (raw.formatVersion !== 1 || !raw.data) throw new Error('Backup local inválido ou incompatível.'); const backup = parse(raw.data); await this.save(backup); return backup; }
};
export const classifyItem = (item: InventoryItem, rules: InventoryRule[], overrides: Record<string, InventoryClassification>): { classification: InventoryClassification; reason: string } => {
  if (overrides[item.id] === 'protected') return { classification: 'protected', reason: 'Proteção manual' };
  if (item.equipped) return { classification: 'protected', reason: 'Item equipado' };
  if (item.favorite) return { classification: 'protected', reason: 'Favorito' };
  const match = rules.find((rule) => rule.enabled && ((rule.kind === 'exact-name' && rule.value === item.name) || (rule.kind === 'rarity' && rule.value === item.rarity)));
  if (match) return { classification: match.classification === 'sell-candidate' && !item.category ? 'unknown' : match.classification, reason: `Regra: ${match.id}` };
  return { classification: 'unknown', reason: 'Sem regra aplicável' };
};
