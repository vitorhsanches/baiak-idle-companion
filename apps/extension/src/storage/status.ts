import type { ActionStatus } from '../actions/autoSell/types';
import { contextInvalidatedError, isExtensionRuntimeUsable } from '../content/runtime';
export const ACTION_STATUS_KEY = 'companion.actions.status';
export const emptyActionStatus = (threshold = 30): ActionStatus => ({
  contentScriptConnected: false, state: 'disabled', inventoryCurrent: null, inventoryCapacity: null,
  sellButtonFound: false, sellButtonReady: false, cooldownText: null, lastEvaluationAt: null,
  lastSellClickAt: null, lastConfirmationAt: null, lastSaleAt: null, lastError: null,
  updatedAt: new Date(0).toISOString(), observerRunning: false, safetyTimerRunning: false,
  stateEnteredAt: new Date(0).toISOString(), stateAgeMs: 0, lastReconciliationAt: null, lastRecoveryAt: null,
  sellButtonDisabled: false, sellButtonClasses: [], cooldownDetected: false, activeCycle: false, clickGuardRemainingMs: 0,
  inventory: { current: null, capacity: null }, threshold,
  sellButton: { found: false, ready: false, disabled: false, classes: [], cooldownText: null },
  confirmationFound: false, logs: []
});
export const loadActionStatus = async (): Promise<ActionStatus> => {
  if (!isExtensionRuntimeUsable()) throw contextInvalidatedError();
  const values = await chrome.storage.local.get(ACTION_STATUS_KEY); const value = values[ACTION_STATUS_KEY];
  return value && typeof value === 'object' ? value as ActionStatus : emptyActionStatus();
};
export const saveActionStatus = async (status: ActionStatus): Promise<void> => {
  if (!isExtensionRuntimeUsable()) throw contextInvalidatedError();
  await chrome.storage.local.set({ [ACTION_STATUS_KEY]: status });
};
