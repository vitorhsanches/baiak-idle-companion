export type AutoSellState = 'disabled' | 'waiting-for-threshold' | 'waiting-for-sell-button' | 'opening-sale' | 'waiting-for-confirmation' | 'waiting-for-manual-confirmation' | 'confirming-sale' | 'waiting-for-cooldown' | 'cooldown' | 'error';
export interface AutoSellSettings { enabled: boolean; autoConfirm: boolean; threshold: number }
export interface ActionSettings { autoSell: AutoSellSettings }
export interface ActionLog { at: string; message: string }
export interface ActionStatus {
  contentScriptConnected: boolean; state: AutoSellState;
  inventoryCurrent: number | null; inventoryCapacity: number | null;
  sellButtonFound: boolean; sellButtonReady: boolean; cooldownText: string | null;
  lastEvaluationAt: string | null; lastSellClickAt: string | null;
  lastConfirmationAt: string | null; lastSaleAt: string | null; lastError: string | null;
  updatedAt: string; observerRunning: boolean; safetyTimerRunning: boolean;
  stateEnteredAt: string; stateAgeMs: number; lastReconciliationAt: string | null; lastRecoveryAt: string | null;
  sellButtonDisabled: boolean; sellButtonClasses: string[]; cooldownDetected: boolean;
  activeCycle: boolean; clickGuardRemainingMs: number;
  inventory: { current: number | null; capacity: number | null }; threshold: number;
  sellButton: { found: boolean; ready: boolean; disabled: boolean; classes: string[]; cooldownText: string | null };
  confirmationFound: boolean; logs: ActionLog[];
}
