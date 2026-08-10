import { saveActionStatus } from '../../storage/status';
import { isExtensionContextInvalidated, isExtensionRuntimeUsable } from '../../content/runtime';
import { canConfirmSale, findSaleConfirmation, isSellButtonReady, readInventory, readSellButton } from './dom';
import type { ActionSettings, ActionStatus, AutoSellState } from './types';

export const CLICK_GUARD_MS = 5_000;
export const DEBOUNCE_MS = 100;
export const SAFETY_INTERVAL_MS = 1_000;
export interface AutoSellController { update(settings: ActionSettings['autoSell']): void; stop(): void; evaluate(): void; invalidateContext(): void; getState(): AutoSellState }

export const createAutoSellController = (initial: ActionSettings['autoSell'], write: (status: ActionStatus) => Promise<void> = saveActionStatus): AutoSellController => {
  let settings = initial; let state: AutoSellState = 'disabled'; let observer: MutationObserver | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null; let safety: ReturnType<typeof setInterval> | null = null;
  let lastClickAt = 0; let disposed = false; let contextInvalidated = false; let cycleActive = false; let signature = '';
  let status: ActionStatus = { contentScriptConnected: true, state, inventoryCurrent: null, inventoryCapacity: null,
    sellButtonFound: false, sellButtonReady: false, cooldownText: null, lastEvaluationAt: null,
    lastSellClickAt: null, lastConfirmationAt: null, lastSaleAt: null, lastError: null,
    updatedAt: new Date().toISOString(), observerRunning: false, safetyTimerRunning: false,
    inventory: { current: null, capacity: null }, threshold: settings.threshold,
    sellButton: { found: false, ready: false, disabled: false, classes: [], cooldownText: null }, confirmationFound: false, logs: [] };
  const invalidateContext = (): void => {
    if (contextInvalidated) return;
    contextInvalidated = true; disposed = true; clearRuntime(); cycleActive = false;
    state = 'disabled'; status.state = state; status.contentScriptConnected = false;
    console.info('[BIC] extension context invalidated; controller stopped');
  };
  const persist = (): void => {
    if (contextInvalidated) return;
    status.updatedAt = new Date().toISOString();
    void write(structuredClone(status)).catch((error: unknown) => {
      if (isExtensionContextInvalidated(error)) invalidateContext();
      else console.error('[BIC AutoSell] status persistence failed', error);
    });
  };
  const log = (message: string): void => { status.logs = [...status.logs, { at: new Date().toISOString(), message }].slice(-50); console.info(`[BIC AutoSell] ${message}`); };
  const transition = (next: AutoSellState): void => { if (state !== next) { log(`state: ${state} -> ${next}`); state = next; status.state = next; } };
  const clearRuntime = (): void => { observer?.disconnect(); observer = null; if (debounce) clearTimeout(debounce); debounce = null; if (safety) clearInterval(safety); safety = null; status.observerRunning = false; status.safetyTimerRunning = false; };
  const schedule = (): void => { if (!settings.enabled || disposed) return; if (debounce) clearTimeout(debounce); debounce = setTimeout(() => { debounce = null; evaluate(); }, DEBOUNCE_MS); };
  const inspect = () => {
    const inventory = readInventory(); const button = readSellButton(); const ready = button ? isSellButtonReady(button) : false; const modal = findSaleConfirmation();
    const nextInventory = inventory ?? { current: null, capacity: null };
    status = { ...status, contentScriptConnected: true, state, threshold: settings.threshold, inventory: nextInventory,
      inventoryCurrent: nextInventory.current, inventoryCapacity: nextInventory.capacity,
      sellButtonFound: Boolean(button), sellButtonReady: ready, cooldownText: button && !ready ? button.textContent?.trim() || null : null,
      sellButton: { found: Boolean(button), ready, disabled: Boolean(button && (button.disabled || button.hasAttribute('disabled'))), classes: button ? [...button.classList] : [], cooldownText: button && !ready ? button.textContent?.trim() || null : null },
      confirmationFound: Boolean(modal), lastEvaluationAt: new Date().toISOString() };
    return { inventory, button, ready, modal };
  };
  const evaluate = (): void => {
    if (disposed || !settings.enabled) return;
    if (!isExtensionRuntimeUsable()) { invalidateContext(); return; }
    try {
      const { inventory, button, ready, modal } = inspect();
      if (state === 'waiting-for-manual-confirmation') {
        if (modal) { persist(); return; }
        if (button && !ready) { cycleActive = false; status.lastConfirmationAt = new Date().toISOString(); status.lastSaleAt = status.lastConfirmationAt; transition('cooldown'); log('cooldown started'); }
        else { cycleActive = false; transition('waiting-for-threshold'); log('blocked: confirmation cancelled'); }
      }
      if (state === 'waiting-for-cooldown' || state === 'confirming-sale') {
        if (button && !ready) { cycleActive = false; status.lastSaleAt = new Date().toISOString(); transition('cooldown'); log('cooldown started'); } else { persist(); return; }
      }
      if (state === 'cooldown') { if (!button || !ready) { persist(); return; } log('cooldown finished'); cycleActive = false; }
      if (state === 'opening-sale' || state === 'waiting-for-confirmation') {
        if (!modal) { transition('waiting-for-confirmation'); persist(); return; }
        log('confirmation detected');
        if (!settings.autoConfirm) { transition('waiting-for-manual-confirmation'); persist(); return; }
        transition('confirming-sale'); const current = findSaleConfirmation();
        if (!settings.enabled || !current || current.card !== modal.card || !canConfirmSale(current)) {
          transition('error'); status.lastError = 'Confirmation became invalid'; cycleActive = false; persist(); return;
        }
        if (!isExtensionRuntimeUsable()) { invalidateContext(); return; }
        current.confirm.click(); status.lastConfirmationAt = new Date().toISOString(); log('confirmation click'); transition('waiting-for-cooldown'); persist(); return;
      }
      if (!inventory || inventory.current <= settings.threshold) { cycleActive = false; transition('waiting-for-threshold'); persist(); return; }
      if (!button || !ready) { transition(button ? 'cooldown' : 'waiting-for-sell-button'); persist(); return; }
      if (cycleActive || Date.now() - lastClickAt < CLICK_GUARD_MS) { log('blocked: click guard'); persist(); return; }
      const freshButton = readSellButton(); const freshInventory = readInventory();
      if (!isExtensionRuntimeUsable()) { invalidateContext(); return; }
      if (!settings.enabled || !freshButton || !isSellButtonReady(freshButton) || !freshInventory || freshInventory.current <= settings.threshold) { log('blocked: DOM changed before click'); persist(); return; }
      cycleActive = true; transition('opening-sale'); freshButton.click(); lastClickAt = Date.now(); status.lastSellClickAt = new Date(lastClickAt).toISOString(); log('sell click'); persist();
    } catch (error) { cycleActive = false; transition('error'); status.lastError = error instanceof Error ? error.message : String(error); log(`blocked: ${status.lastError}`); persist(); }
  };
  const start = (): void => {
    if (observer || disposed) return;
    observer = new MutationObserver(() => { const inventory = document.querySelector('#inv-count')?.textContent ?? ''; const button = readSellButton(); const modal = findSaleConfirmation(); const next = `${inventory}|${button?.disabled}|${button?.className}|${Boolean(modal)}`; if (next !== signature) { signature = next; schedule(); } });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'disabled'] });
    safety = setInterval(evaluate, SAFETY_INTERVAL_MS); status.observerRunning = true; status.safetyTimerRunning = true; log('started'); schedule(); persist();
  };
  const stopRuntime = (): void => { clearRuntime(); cycleActive = false; transition('disabled'); log('stopped'); persist(); };
  const update = (next: ActionSettings['autoSell']): void => { if (contextInvalidated) return; settings = next; status.threshold = next.threshold; if (!next.enabled) stopRuntime(); else { start(); schedule(); } };
  update(initial);
  return { update, evaluate, invalidateContext, getState: () => state, stop: () => { if (contextInvalidated) return; disposed = true; stopRuntime(); status.contentScriptConnected = false; persist(); } };
};
