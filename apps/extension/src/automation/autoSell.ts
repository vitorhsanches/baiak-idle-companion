import { createMessage, type AutoSellStatus } from '../integration/protocol';

export const INVENTORY_COUNT_SELECTOR = '#inv-count';
export const SELL_BUTTON_SELECTOR = '#sell-all';
export const DEFAULT_THRESHOLD = 30;
export const CLICK_GUARD_MS = 5_000;
export const EVALUATION_DEBOUNCE_MS = 300;
export const SETTINGS_KEY = 'companion.settings';
const GUARD_KEY = 'companion.auto-sell.last-click-at';

export interface AutoSellSettings { enabled: boolean; threshold: number }

export const normalizeAutoSellSettings = (value: unknown): AutoSellSettings => {
  const stored = value && typeof value === 'object'
    ? value as { autoSellEnabled?: unknown; autoSellThreshold?: unknown }
    : undefined;
  const threshold = typeof stored?.autoSellThreshold === 'number' && Number.isFinite(stored.autoSellThreshold)
    ? Math.max(0, Math.floor(stored.autoSellThreshold))
    : DEFAULT_THRESHOLD;
  return { enabled: stored?.autoSellEnabled === true, threshold };
};

export const parseInventoryCount = (value: string | null): number | null => {
  const match = value?.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (!match) return null;
  const current = Number.parseInt(match[1], 10);
  return Number.isFinite(current) ? current : null;
};

export const isSellButtonReady = (button: HTMLButtonElement): boolean =>
  !button.disabled && !button.hasAttribute('disabled') && !button.classList.contains('cd');

export function startAutoSellObserver(): () => void {
  let settings: AutoSellSettings = { enabled: false, threshold: DEFAULT_THRESHOLD };
  let evaluationTimer: ReturnType<typeof setTimeout> | undefined;
  let observer: MutationObserver | undefined;
  let saleInProgress = false;
  let lastClickAt = 0;
  let stopped = false;
  let initialized = false;

  const report = async (patch: Partial<AutoSellStatus>): Promise<void> => {
    if (stopped) return;
    const status: AutoSellStatus = {
      controllerInitialized: initialized,
      observerRunning: observer !== undefined,
      enabled: settings.enabled,
      inventoryCount: null,
      threshold: settings.threshold,
      sellButtonFound: false,
      sellButtonReady: false,
      lastBlockReason: 'not-evaluated',
      lastEvaluationAt: undefined,
      lastClickAt: lastClickAt ? new Date(lastClickAt).toISOString() : undefined,
      ...patch
    };
    try { await chrome.runtime.sendMessage(createMessage('auto-sell-status', 'content-script', status)); } catch { /* background unavailable */ }
  };

  const block = async (reason: string, status: Partial<AutoSellStatus>): Promise<void> => {
    console.info(`[AutoSell] blocked: ${reason}`);
    await report({ ...status, lastBlockReason: reason });
  };

  const evaluate = async (): Promise<void> => {
    if (stopped || !settings.enabled) return;
    console.info('[AutoSell] evaluation started');
    const lastEvaluationAt = new Date().toISOString();
    const inventoryElement = document.querySelector<HTMLElement>(INVENTORY_COUNT_SELECTOR);
    const inventoryCount = parseInventoryCount(inventoryElement?.textContent ?? null);
    const candidate = document.querySelector(SELL_BUTTON_SELECTOR);
    const button = candidate instanceof HTMLButtonElement ? candidate : null;
    const ready = button ? isSellButtonReady(button) : false;
    const status = {
      inventoryCount,
      sellButtonFound: button !== null,
      sellButtonReady: ready,
      lastEvaluationAt
    };
    if (!inventoryElement) return block('inventory-element-missing', status);
    if (inventoryCount === null) return block('invalid-inventory-count', status);
    if (inventoryCount <= settings.threshold) return block('threshold-not-exceeded', status);
    if (!button) return block('sell-button-missing', status);
    if (!ready) return block('sell-button-not-ready', status);
    if (saleInProgress) return block('sale-in-progress', status);

    const guardValues = await chrome.storage.local.get(GUARD_KEY);
    if (stopped || !settings.enabled) return;
    const persisted = guardValues[GUARD_KEY];
    if (typeof persisted === 'number' && Number.isFinite(persisted)) lastClickAt = Math.max(lastClickAt, persisted);
    if (Date.now() - lastClickAt < CLICK_GUARD_MS) return block('click-guard-active', status);
    if (!button.isConnected || !isSellButtonReady(button)) return block('sell-button-changed', status);

    saleInProgress = true;
    button.click();
    lastClickAt = Date.now();
    saleInProgress = false;
    console.info('[AutoSell] click dispatched');
    await chrome.storage.local.set({ [GUARD_KEY]: lastClickAt });
    await report({ ...status, lastBlockReason: 'none', lastClickAt: new Date(lastClickAt).toISOString() });
  };

  const schedule = (immediate = false): void => {
    if (stopped || !settings.enabled) return;
    if (evaluationTimer) clearTimeout(evaluationTimer);
    if (immediate) { evaluationTimer = undefined; void evaluate().catch(() => { saleInProgress = false; }); return; }
    evaluationTimer = setTimeout(() => {
      evaluationTimer = undefined;
      void evaluate().catch(() => { saleInProgress = false; });
    }, EVALUATION_DEBOUNCE_MS);
  };

  const stopObserver = (): void => {
    observer?.disconnect();
    observer = undefined;
    if (evaluationTimer) clearTimeout(evaluationTimer);
    evaluationTimer = undefined;
  };

  const startObserver = (): void => {
    if (observer || stopped) return;
    observer = new MutationObserver(() => schedule());
    observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['class', 'disabled']
    });
    console.info('[AutoSell] observer started');
  };

  const applySettings = (next: AutoSellSettings, source: 'loaded' | 'changed'): void => {
    const wasEnabled = settings.enabled;
    const thresholdChanged = settings.threshold !== next.threshold;
    settings = next;
    console.info(`[AutoSell] settings ${source}`);
    if (!settings.enabled) {
      stopObserver();
      void report({ lastBlockReason: 'disabled' });
      return;
    }
    startObserver();
    if (!wasEnabled || thresholdChanged || source === 'loaded') schedule(true);
  };

  const storageListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string): void => {
    if (areaName !== 'local') return;
    const change = changes[SETTINGS_KEY];
    if (!change) return;
    applySettings(normalizeAutoSellSettings(change.newValue), 'changed');
  };

  chrome.storage.onChanged.addListener(storageListener);
  initialized = true;
  console.info('[AutoSell] controller initialized');
  void chrome.storage.local.get(SETTINGS_KEY).then((values) => {
    if (!stopped) applySettings(normalizeAutoSellSettings(values[SETTINGS_KEY]), 'loaded');
  }).catch(() => { if (!stopped) void block('settings-load-failed', {}); });

  return () => {
    stopped = true;
    stopObserver();
    chrome.storage.onChanged.removeListener(storageListener);
    saleInProgress = false;
  };
}
