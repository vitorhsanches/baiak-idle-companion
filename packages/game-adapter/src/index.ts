import type { Character, CombatSession, Hunt, InventoryItem } from '@companion/domain';

export interface GameSnapshot {
  character: Character;
  hunts: Hunt[];
  inventory: InventoryItem[];
  combat: CombatSession;
}
export interface GameDataProvider {
  readonly id: string;
  readSnapshot(): Promise<GameSnapshot>;
}
export class MockGameDataProvider implements GameDataProvider {
  readonly id = 'mock';
  constructor(private readonly snapshot: GameSnapshot) {}
  async readSnapshot(): Promise<GameSnapshot> {
    return structuredClone(this.snapshot);
  }
}

// Future DOM providers must implement this boundary without reading credentials,
// storage, cookies, authenticated payloads, or mutating the game.
export type ReadOnlyDomSelectors = Readonly<Record<string, string>>;
