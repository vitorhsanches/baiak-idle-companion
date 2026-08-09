import type { ActionSettings } from '../actions/autoSell/types';
export const ACTION_SETTINGS_KEY = 'companion.actions.settings';
export const DEFAULT_ACTION_SETTINGS: ActionSettings = { autoSell: { enabled: false, autoConfirm: false, threshold: 30 } };
export const normalizeActionSettings = (value: unknown): ActionSettings => {
  const root = value && typeof value === 'object' ? value as { autoSell?: unknown } : {};
  const raw = root.autoSell && typeof root.autoSell === 'object' ? root.autoSell as Partial<Record<keyof ActionSettings['autoSell'], unknown>> : {};
  const threshold = typeof raw.threshold === 'number' && Number.isFinite(raw.threshold) ? Math.max(0, Math.floor(raw.threshold)) : 30;
  return { autoSell: { enabled: raw.enabled === true, autoConfirm: raw.autoConfirm === true, threshold } };
};
export const loadActionSettings = async (): Promise<ActionSettings> => {
  const values = await chrome.storage.local.get(ACTION_SETTINGS_KEY);
  return normalizeActionSettings(values[ACTION_SETTINGS_KEY]);
};
export const saveActionSettings = async (settings: ActionSettings): Promise<void> => {
  await chrome.storage.local.set({ [ACTION_SETTINGS_KEY]: normalizeActionSettings(settings) });
};
