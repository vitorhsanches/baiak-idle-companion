export type AutoSellState = 'disabled' | 'waiting-for-threshold' | 'waiting-for-sell-button' | 'opening-sale' | 'waiting-for-confirmation' | 'waiting-for-manual-confirmation' | 'confirming-sale' | 'waiting-for-cooldown' | 'cooldown' | 'error';
export interface AutoSellSettings { enabled: boolean; autoConfirm: boolean; threshold: number }
export interface ActionSettings { autoSell: AutoSellSettings }
export interface ActionLog { at: string; message: string }
export interface ActionStatus {
  connected: boolean; state: AutoSellState;
  inventory: { current: number | null; capacity: number | null }; threshold: number;
  sellButton: { found: boolean; ready: boolean; disabled: boolean; classes: string[]; cooldownText: string | null };
  confirmationFound: boolean; lastEvaluation: string | null; lastSellClick: string | null;
  lastConfirmation: string | null; lastSale: string | null; lastError: string | null; logs: ActionLog[];
}
