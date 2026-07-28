import type { Character, CharacterSnapshot, CombatSession, DataConfidence, DataSource, DataUnavailableReason, Hunt, InventoryItem } from '@companion/domain';

export interface GameSnapshot { character: Character; hunts: Hunt[]; inventory: InventoryItem[]; combat: CombatSession; }
export interface GameAdapterResult<T> { value?: T; source: DataSource; confidence: DataConfidence; unavailableReason?: DataUnavailableReason; errors: string[]; readAt: string; }
export interface GameDataProvider { readonly id: string; readSnapshot(): Promise<GameAdapterResult<GameSnapshot>>; readCharacter(): Promise<GameAdapterResult<CharacterSnapshot>>; }
const now = () => new Date().toISOString();
export class MockGameAdapter implements GameDataProvider {
  readonly id = 'mock';
  constructor(private readonly snapshot: GameSnapshot) {}
  async readSnapshot(): Promise<GameAdapterResult<GameSnapshot>> { return { value: structuredClone(this.snapshot), source: 'demo', confidence: 'high', errors: [], readAt: now() }; }
  async readCharacter(): Promise<GameAdapterResult<CharacterSnapshot>> {
    const c = this.snapshot.character;
    return { value: { name: c.name, vocation: c.vocation, level: c.level, equipment: c.equipment.map((e) => ({ slot: normalizeSlot(e.slot), name: e.name, imbuements: e.imbuements.map((name) => ({ name })) })), talents: { visiblePoints: c.talentPoints }, currentHunt: this.snapshot.hunts[0] ? { name: this.snapshot.hunts[0].name } : undefined, readAt: now(), source: 'demo', confidence: 'high', unavailableFields: [], parsingErrors: [] }, source: 'demo', confidence: 'high', errors: [], readAt: now() };
  }
}
export const gameDomSelectors = { version: 2, characterName: '[data-character-name]', vocation: '[data-vocation]', level: '[data-level], [data-lv]', talentPoints: '[data-talent-points]', equipment: '[data-equipment-slot], [aria-label="Equipamentos"] [data-slot]', hunt: '[data-current-hunt], [aria-label="Hunt"] [data-name]', inventory: '[aria-label="Inventario"] [data-item-id], [data-inventory-open="true"] [data-item-id]' } as const;
const normalizeSlot = (slot: string) => (['helmet','armor','weapon','shield','legs','boots','ring','amulet'].includes(slot.toLowerCase()) ? slot.toLowerCase() : 'unknown') as CharacterSnapshot['equipment'][number]['slot'];
const text = (root: ParentNode, selector: string) => root.querySelector(selector)?.textContent?.trim();
const number = (value?: string) => value && /^\d+$/.test(value) ? Number(value) : undefined;
/** DOM-only, defensive and passive. Callers supply an isolated Document; this class never queries storage, cookies or network. */
export class DomGameAdapter implements GameDataProvider {
  readonly id = 'dom';
  constructor(private readonly document: Document) {}
  async readSnapshot(): Promise<GameAdapterResult<GameSnapshot>> { return { source: 'unavailable', confidence: 'none', unavailableReason: 'not-supported', errors: ['Snapshot completo requer catálogos locais.'], readAt: now() }; }
  async readCharacter(): Promise<GameAdapterResult<CharacterSnapshot>> {
    const errors: string[] = []; const unavailableFields: string[] = [];
    const name = text(this.document, gameDomSelectors.characterName); const vocation = text(this.document, gameDomSelectors.vocation);
    const levelText = text(this.document, gameDomSelectors.level); const level = number(levelText);
    if (levelText && level === undefined) errors.push('Nível visível em formato inválido.');
    for (const [field, value] of Object.entries({ name, vocation, level })) if (value === undefined) unavailableFields.push(field);
    const equipment = [...this.document.querySelectorAll(gameDomSelectors.equipment)].map((node) => ({ slot: normalizeSlot(node.getAttribute('data-slot') ?? 'unknown'), name: node.getAttribute('data-name')?.trim() || 'Item visível sem nome', imbuements: (node.getAttribute('data-imbuements') ?? '').split(',').map((name) => name.trim()).filter(Boolean).map((name) => ({ name })) }));
    const talentPoints = number(text(this.document, gameDomSelectors.talentPoints)); const hunt = text(this.document, gameDomSelectors.hunt);
    if (talentPoints === undefined) unavailableFields.push('talents'); if (!hunt) unavailableFields.push('currentHunt');
    const source: DataSource = name || vocation || level !== undefined || equipment.length ? 'real' : 'unavailable';
    const confidence: DataConfidence = errors.length ? 'low' : source === 'unavailable' ? 'none' : unavailableFields.length ? 'medium' : 'high';
    const value: CharacterSnapshot = { name, vocation, level, equipment, talents: talentPoints === undefined ? undefined : { visiblePoints: talentPoints }, currentHunt: hunt ? { name: hunt } : undefined, readAt: now(), source, confidence, unavailableFields, parsingErrors: errors };
    return { value, source, confidence, unavailableReason: source === 'unavailable' ? 'not-found' : undefined, errors, readAt: value.readAt };
  }
}
export { MockGameAdapter as MockGameDataProvider };
