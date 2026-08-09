import type { ActionStatus } from '../actions/autoSell/types';
export const ACTION_STATUS_KEY = 'companion.actions.status';
export const emptyActionStatus = (threshold = 30): ActionStatus => ({
  connected: false, state: 'disabled', inventory: { current: null, capacity: null }, threshold,
  sellButton: { found: false, ready: false, disabled: false, classes: [], cooldownText: null },
  confirmationFound: false, lastEvaluation: null, lastSellClick: null, lastConfirmation: null,
  lastSale: null, lastError: null, logs: []
});
export const loadActionStatus = async (): Promise<ActionStatus> => {
  const values = await chrome.storage.local.get(ACTION_STATUS_KEY); const value = values[ACTION_STATUS_KEY];
  return value && typeof value === 'object' ? value as ActionStatus : emptyActionStatus();
};
export const saveActionStatus = async (status: ActionStatus): Promise<void> => { await chrome.storage.local.set({ [ACTION_STATUS_KEY]: status }); };
