import type { Boss, Hunt, InventoryItem, Monster, ServerMultipliers } from '@companion/domain';

export interface LocalCatalog { version: 1; hunts?: Hunt[]; monsters?: Monster[]; items?: InventoryItem[]; bosses?: Boss[]; server?: ServerMultipliers; }
export interface ImportedCatalog { catalog: LocalCatalog; checksum: string; importedAt: string; fileName?: string; size?: number; }
const maxBytes = 1_000_000;
const digest = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text); const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
const validArray = (value: unknown, key: string) => !Array.isArray(value) || value.every((entry) => entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>)[key] === 'string');
export async function parseLocalCatalog(file: File): Promise<ImportedCatalog> {
  if (file.size > maxBytes) throw new Error('Arquivo excede o limite local de 1 MB.');
  const text = await file.text(); let raw: unknown;
  try { raw = JSON.parse(text) as unknown; } catch { throw new Error('JSON inválido.'); }
  if (!raw || typeof raw !== 'object') throw new Error('Catálogo precisa ser um objeto.');
  const candidate = raw as Record<string, unknown>;
  if (candidate.version !== 1) throw new Error('Versão de catálogo incompatível.');
  if (!validArray(candidate.hunts, 'id') || !validArray(candidate.monsters, 'id') || !validArray(candidate.items, 'id') || !validArray(candidate.bosses, 'id')) throw new Error('Schema de catálogo inválido.');
  return { catalog: candidate as unknown as LocalCatalog, checksum: await digest(text), importedAt: new Date().toISOString(), fileName: file.name, size: file.size };
}
const catalogKey = 'companion.catalog.v1';
export const catalogStore = {
  async load(): Promise<ImportedCatalog | undefined> { const result = await chrome.storage.local.get(catalogKey); return result[catalogKey] as ImportedCatalog | undefined; },
  async save(value: ImportedCatalog): Promise<void> { await chrome.storage.local.set({ [catalogKey]: value }); },
  async clear(): Promise<void> { await chrome.storage.local.remove(catalogKey); }
};
