import { createMessage, type AutoSellStatus } from '../integration/protocol';

export const INVENTORY_COUNT_SELECTOR = '#inv-count';
export const SELL_BUTTON_SELECTOR = '#sell-all';
export const DEFAULT_THRESHOLD = 30;
export const CLICK_GUARD_MS = 5_000;
export const EVALUATION_DEBOUNCE_MS = 300;
export const CONFIRMATION_TIMEOUT_MS = 3_000;
export const COOLDOWN_TIMEOUT_MS = 3_000;
export const SETTINGS_KEY = 'companion.settings';
const GUARD_KEY = 'companion.auto-sell.last-click-at';
const CONFIRMATION_TITLE = 'Vender tudo';

export interface AutoSellSettings { enabled: boolean; threshold: number; autoConfirmSale: boolean }
type PendingWait = { cancel: () => void };

export const normalizeAutoSellSettings = (value: unknown): AutoSellSettings => {
  const stored = value && typeof value === 'object'
    ? value as { autoSellEnabled?: unknown; autoSellThreshold?: unknown; autoConfirmSale?: unknown }
    : undefined;
  const threshold = typeof stored?.autoSellThreshold === 'number' && Number.isFinite(stored.autoSellThreshold)
    ? Math.max(0, Math.floor(stored.autoSellThreshold)) : DEFAULT_THRESHOLD;
  return { enabled: stored?.autoSellEnabled === true, threshold, autoConfirmSale: stored?.autoConfirmSale === true };
};

export const parseInventoryCount = (value: string | null): number | null => {
  const match = value?.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (!match) return null;
  const current = Number.parseInt(match[1], 10);
  return Number.isFinite(current) ? current : null;
};

const normalizedText = (value: string | null): string => value?.replace(/\s+/g, ' ').trim() ?? '';
export const isElementVisible = (element: HTMLElement): boolean => {
  if (!element.isConnected || element.hidden || element.closest('[hidden]')) return false;
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.getClientRects().length > 0;
};
export const isSellButtonReady = (button: HTMLButtonElement): boolean =>
  !button.disabled && !button.hasAttribute('disabled') && !button.classList.contains('cd');
const isCooldown = (button: HTMLButtonElement | null): boolean => Boolean(button &&
  (button.disabled || button.hasAttribute('disabled') || button.classList.contains('cd')));

export interface ConfirmationElements { card: HTMLElement; button: HTMLButtonElement }
export const findSaleConfirmation = (): ConfirmationElements | null => {
  for (const card of document.querySelectorAll<HTMLElement>('.im-card')) {
    if (!isElementVisible(card)) continue;
    const title = card.querySelector<HTMLElement>('#confirm-modal-body .sell-sum-head');
    if (!title || normalizedText(title.textContent) !== CONFIRMATION_TITLE) continue;
    const button = card.querySelector<HTMLButtonElement>(':scope > .confirm-actions > button#confirm-yes, :scope .confirm-actions > button#confirm-yes');
    const cancel = card.querySelector<HTMLButtonElement>(':scope > .confirm-actions > button#confirm-no, :scope .confirm-actions > button#confirm-no');
    if (!button || !cancel || !isElementVisible(button) || button.disabled || normalizedText(button.textContent) !== CONFIRMATION_TITLE) continue;
    return { card, button };
  }
  return null;
};

export function startAutoSellObserver(): () => void {
  let settings: AutoSellSettings = { enabled: false, threshold: DEFAULT_THRESHOLD, autoConfirmSale: false };
  let evaluationTimer: ReturnType<typeof setTimeout> | undefined;
  let observer: MutationObserver | undefined;
  let pendingWait: PendingWait | undefined;
  let saleInProgress = false;
  let lastClickAt = 0;
  let lastConfirmationAt: string | undefined;
  let stopped = false;
  let initialized = false;
  let confirmationState = 'idle';
  let cooldownDetected = false;
  let cooldownActive = false;
  let cycleState = 'idle';
  let lastCooldownStartedAt: string | undefined;
  let lastCooldownFinishedAt: string | undefined;
  let previousSellButtonReady: boolean | undefined;

  const report = async (patch: Partial<AutoSellStatus>): Promise<void> => {
    if (stopped) return;
    const status: AutoSellStatus = {
      controllerInitialized: initialized, observerRunning: observer !== undefined,
      enabled: settings.enabled, autoConfirmSale: settings.autoConfirmSale,
      inventoryCount: null, threshold: settings.threshold, sellButtonFound: false, sellButtonReady: false,
      lastBlockReason: 'not-evaluated', lastEvaluationAt: undefined,
      lastClickAt: lastClickAt ? new Date(lastClickAt).toISOString() : undefined,
      confirmationModalFound: false, confirmationButtonFound: false, confirmationState,
      lastConfirmationAt, cooldownDetected, saleInProgress, cooldownActive, cycleState,
      lastCooldownStartedAt, lastCooldownFinishedAt, ...patch
    };
    try { await chrome.runtime.sendMessage(createMessage('auto-sell-status', 'content-script', status)); } catch { /* background unavailable */ }
  };
  const block = async (reason: string, status: Partial<AutoSellStatus>): Promise<void> => {
    console.info(`[AutoSell] blocked: ${reason}`);
    await report({ ...status, lastBlockReason: reason });
  };

  const waitFor = <T>(read: () => T | null, timeoutMs: number): Promise<T | null> => new Promise((resolve) => {
    let settled = false;
    const finish = (value: T | null): void => {
      if (settled) return; settled = true; mutationObserver.disconnect(); clearTimeout(timeout); pendingWait = undefined; resolve(value);
    };
    const mutationObserver = new MutationObserver(() => { const value = read(); if (value !== null) finish(value); });
    const timeout = setTimeout(() => finish(null), timeoutMs);
    pendingWait = { cancel: () => finish(null) };
    const initial = read();
    if (initial !== null) finish(initial);
    else mutationObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'disabled', 'hidden', 'style'] });
  });

  const finishFlow = (): void => { saleInProgress = false; };
  const handleConfirmation = async (base: Partial<AutoSellStatus>): Promise<void> => {
    console.info('[AutoSell] waiting for confirmation'); confirmationState = 'waiting-for-confirmation'; cycleState = 'opening-confirmation';
    await report({ ...base, confirmationState });
    const found = await waitFor(findSaleConfirmation, CONFIRMATION_TIMEOUT_MS);
    if (stopped) return;
    if (!settings.enabled) { finishFlow(); return; }
    if (!found) {
      confirmationState = 'confirmation-timeout'; console.info('[AutoSell] confirmation timeout');
      await report({ ...base, confirmationState, lastBlockReason: 'confirmation-timeout' }); finishFlow(); return;
    }
    console.info('[AutoSell] confirmation modal detected');
    const confirmationStatus = { ...base, confirmationModalFound: true, confirmationButtonFound: true };
    if (!settings.autoConfirmSale) {
      confirmationState = 'waiting-for-manual-confirmation'; console.info('[AutoSell] waiting for manual confirmation');
      await report({ ...confirmationStatus, confirmationState, lastBlockReason: 'waiting-for-manual-confirmation' }); finishFlow(); return;
    }
    const current = findSaleConfirmation();
    if (!settings.enabled || !settings.autoConfirmSale || !saleInProgress || !current || current.card !== found.card || current.button !== found.button) {
      confirmationState = 'confirmation-invalidated'; await block('confirmation-invalidated', confirmationStatus); finishFlow(); return;
    }
    cycleState = 'confirming'; current.button.click(); lastConfirmationAt = new Date().toISOString(); confirmationState = 'confirmation-clicked';
    console.info('[AutoSell] confirmation click dispatched');
    await report({ ...confirmationStatus, confirmationState, lastConfirmationAt });
    cycleState = 'waiting-for-cooldown';
    const cooldown = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(SELL_BUTTON_SELECTOR);
      return isCooldown(button) ? button : null;
    }, COOLDOWN_TIMEOUT_MS);
    if (stopped) return;
    if (cooldown) {
      cooldownDetected = true; cooldownActive = true; previousSellButtonReady = false;
      lastCooldownStartedAt = new Date().toISOString(); confirmationState = 'sale-confirmed-visually'; cycleState = 'cooldown-active';
      console.info('[AutoSell] cooldown detected'); console.info('[AutoSell] cooldown active'); finishFlow();
      await report({ ...confirmationStatus, confirmationState, cooldownDetected: true, cooldownActive: true, cycleState, lastBlockReason: 'none' });
    } else {
      confirmationState = 'sale-result-unconfirmed'; cycleState = 'sale-result-unconfirmed'; console.info('[AutoSell] sale result unconfirmed');
      await report({ ...confirmationStatus, confirmationState, cooldownDetected: false, lastBlockReason: 'sale-result-unconfirmed' });
    }
    finishFlow();
  };

  const evaluate = async (): Promise<void> => {
    if (stopped || !settings.enabled || saleInProgress) return;
    cycleState = 'evaluating'; console.info('[AutoSell] evaluation started');
    const lastEvaluationAt = new Date().toISOString();
    const inventoryElement = document.querySelector<HTMLElement>(INVENTORY_COUNT_SELECTOR);
    const inventoryCount = parseInventoryCount(inventoryElement?.textContent ?? null);
    const candidate = document.querySelector(SELL_BUTTON_SELECTOR);
    const button = candidate instanceof HTMLButtonElement ? candidate : null;
    const ready = button ? isSellButtonReady(button) : false;
    const base = { inventoryCount, sellButtonFound: button !== null, sellButtonReady: ready, lastEvaluationAt };
    const existingModal = findSaleConfirmation();
    if (existingModal) return block('waiting-for-manual-confirmation', { ...base, confirmationModalFound: true, confirmationButtonFound: true, confirmationState: 'waiting-for-manual-confirmation' });
    if (!inventoryElement) return block('inventory-element-missing', base);
    if (inventoryCount === null) return block('invalid-inventory-count', base);
    if (inventoryCount <= settings.threshold) return block('threshold-not-exceeded', base);
    if (!button) return block('sell-button-missing', base);
    if (!ready) return block('sell-button-not-ready', base);
    const guardValues = await chrome.storage.local.get(GUARD_KEY);
    if (stopped || !settings.enabled || saleInProgress) return;
    const persisted = guardValues[GUARD_KEY];
    if (typeof persisted === 'number' && Number.isFinite(persisted)) lastClickAt = Math.max(lastClickAt, persisted);
    const guardRemaining = CLICK_GUARD_MS - (Date.now() - lastClickAt);
    if (guardRemaining > 0) {
      evaluationTimer = setTimeout(() => { evaluationTimer = undefined; schedule(true); }, guardRemaining);
      return block('click-guard-active', base);
    }
    if (!button.isConnected || !isSellButtonReady(button)) return block('sell-button-changed', base);
    confirmationState = 'idle'; cooldownDetected = false; cooldownActive = false; cycleState = 'evaluating';
    saleInProgress = true; confirmationState = 'sell-clicked'; cycleState = 'opening-confirmation';
    button.click(); lastClickAt = Date.now(); console.info('[AutoSell] click dispatched');
    await chrome.storage.local.set({ [GUARD_KEY]: lastClickAt });
    await handleConfirmation({ ...base, lastClickAt: new Date(lastClickAt).toISOString() });
  };

  const schedule = (immediate = false): void => {
    if (stopped || !settings.enabled || saleInProgress) return;
    if (evaluationTimer) clearTimeout(evaluationTimer);
    if (immediate) { evaluationTimer = undefined; void evaluate().catch(finishFlow); return; }
    evaluationTimer = setTimeout(() => { evaluationTimer = undefined; void evaluate().catch(finishFlow); }, EVALUATION_DEBOUNCE_MS);
  };
  const stopObserver = (): void => { observer?.disconnect(); observer = undefined; if (evaluationTimer) clearTimeout(evaluationTimer); evaluationTimer = undefined; };
  const startObserver = (): void => {
    if (observer || stopped) return;
    const initialButton = document.querySelector<HTMLButtonElement>(SELL_BUTTON_SELECTOR);
    previousSellButtonReady = initialButton ? isSellButtonReady(initialButton) : false;
    observer = new MutationObserver(() => {
      const currentButton = document.querySelector<HTMLButtonElement>(SELL_BUTTON_SELECTOR);
      const currentReady = Boolean(currentButton && isSellButtonReady(currentButton));
      if (cooldownActive) {
        if (previousSellButtonReady === false && currentReady) {
          console.info('[AutoSell] sell button became ready');
          cooldownActive = false; cooldownDetected = false; lastCooldownFinishedAt = new Date().toISOString(); cycleState = 'ready-again';
          console.info('[AutoSell] cycle rearmed'); console.info('[AutoSell] evaluation scheduled after cooldown');
          previousSellButtonReady = true; schedule();
          void report({ sellButtonFound: true, sellButtonReady: true, cooldownDetected: false, cooldownActive: false, cycleState, lastBlockReason: 'none' });
          return;
        }
        previousSellButtonReady = currentReady;
        return;
      }
      previousSellButtonReady = currentReady;
      schedule();
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'disabled'] });
    console.info('[AutoSell] observer started');
  };
  const applySettings = (next: AutoSellSettings, source: 'loaded' | 'changed'): void => {
    const wasEnabled = settings.enabled; const thresholdChanged = settings.threshold !== next.threshold;
    settings = next; console.info(`[AutoSell] settings ${source}`);
    if (!settings.enabled) { pendingWait?.cancel(); stopObserver(); finishFlow(); void report({ lastBlockReason: 'disabled' }); return; }
    startObserver(); if (!wasEnabled || thresholdChanged || source === 'loaded') schedule(true);
  };
  const storageListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string): void => {
    if (areaName === 'local' && changes[SETTINGS_KEY]) applySettings(normalizeAutoSellSettings(changes[SETTINGS_KEY].newValue), 'changed');
  };
  chrome.storage.onChanged.addListener(storageListener); initialized = true; console.info('[AutoSell] controller initialized');
  void chrome.storage.local.get(SETTINGS_KEY).then((values) => { if (!stopped) applySettings(normalizeAutoSellSettings(values[SETTINGS_KEY]), 'loaded'); })
    .catch(() => { if (!stopped) void block('settings-load-failed', {}); });
  return () => { stopped = true; pendingWait?.cancel(); stopObserver(); chrome.storage.onChanged.removeListener(storageListener); finishFlow(); };
}
