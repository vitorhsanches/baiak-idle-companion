import { saveActionStatus } from '../../storage/status';
import { isExtensionContextInvalidated, isExtensionRuntimeUsable } from '../../content/runtime';
import { canConfirmSale, findSaleConfirmation, isSellButtonReady, readInventory, readSellButton } from './dom';
import type { ActionSettings, ActionStatus, AutoSellState } from './types';

export const CLICK_GUARD_MS = 5_000;
export const DEBOUNCE_MS = 100;
export const SAFETY_INTERVAL_MS = 1_000;
const TRANSIENT_TIMEOUT_MS: Partial<Record<AutoSellState, number>> = { 'opening-sale': 3_000, 'waiting-for-confirmation': 5_000, 'confirming-sale': 3_000, 'waiting-for-cooldown': 5_000 };
type Snapshot = { inventory: ReturnType<typeof readInventory>; button: HTMLButtonElement | null; ready: boolean; modal: ReturnType<typeof findSaleConfirmation> };
export interface AutoSellController { update(settings: ActionSettings['autoSell']): void; stop(): void; evaluate(): void; reconcile(): void; invalidateContext(): void; getState(): AutoSellState }

export const createAutoSellController = (initial: ActionSettings['autoSell'], write: (status: ActionStatus) => Promise<void> = saveActionStatus): AutoSellController => {
  let settings = initial; let state: AutoSellState = 'disabled'; let stateEnteredAt = Date.now(); let observer: MutationObserver | null = null; let debounce: ReturnType<typeof setTimeout> | null = null; let safety: ReturnType<typeof setInterval> | null = null;
  let lastClickAt = 0; let confirmationAttempted = false; let disposed = false; let contextInvalidated = false; let cycleActive = false; let signature = '';
  let status: ActionStatus = { contentScriptConnected: true, state, inventoryCurrent: null, inventoryCapacity: null, sellButtonFound: false, sellButtonReady: false, cooldownText: null, lastEvaluationAt: null, lastSellClickAt: null, lastConfirmationAt: null, lastSaleAt: null, lastError: null, updatedAt: new Date().toISOString(), observerRunning: false, safetyTimerRunning: false, stateEnteredAt: new Date(stateEnteredAt).toISOString(), stateAgeMs: 0, lastReconciliationAt: null, lastRecoveryAt: null, sellButtonDisabled: false, sellButtonClasses: [], cooldownDetected: false, activeCycle: false, clickGuardRemainingMs: 0, inventory: { current: null, capacity: null }, threshold: settings.threshold, sellButton: { found: false, ready: false, disabled: false, classes: [], cooldownText: null }, confirmationFound: false, logs: [] };
  const log = (message: string): void => { status.logs = [...status.logs, { at: new Date().toISOString(), message }].slice(-50); console.info(`[BIC AutoSell] ${message}`); };
  const transition = (next: AutoSellState): void => { if (state === next) return; log(`state: ${state} -> ${next}`); state = next; stateEnteredAt = Date.now(); status.state = next; status.stateEnteredAt = new Date(stateEnteredAt).toISOString(); status.stateAgeMs = 0; };
  const clearRuntime = (): void => { observer?.disconnect(); observer = null; if (debounce) clearTimeout(debounce); debounce = null; if (safety) clearInterval(safety); safety = null; status.observerRunning = false; status.safetyTimerRunning = false; };
  const invalidateContext = (): void => { if (contextInvalidated) return; contextInvalidated = true; disposed = true; cycleActive = false; clearRuntime(); transition('disabled'); status.contentScriptConnected = false; console.info('[BIC] extension context invalidated; controller stopped'); };
  const persist = (): void => { if (contextInvalidated) return; status.updatedAt = new Date().toISOString(); void write(structuredClone(status)).catch((error: unknown) => { if (isExtensionContextInvalidated(error)) invalidateContext(); else console.error('[BIC AutoSell] status persistence failed', error); }); };
  const schedule = (): void => { if (!settings.enabled || disposed) return; if (debounce) clearTimeout(debounce); debounce = setTimeout(() => { debounce = null; evaluate(); }, DEBOUNCE_MS); };
  const inspect = (): Snapshot => { const button = readSellButton(); return { inventory: readInventory(), button, ready: button ? isSellButtonReady(button) : false, modal: findSaleConfirmation() }; };
  const updateStatus = (snapshot: Snapshot, reconciliation: boolean): void => { const now = Date.now(); const inventory = snapshot.inventory ?? { current: null, capacity: null }; const disabled = Boolean(snapshot.button && (snapshot.button.disabled || snapshot.button.hasAttribute('disabled'))); const cooldown = Boolean(snapshot.button && !snapshot.ready); const cooldownText = cooldown ? snapshot.button?.textContent?.trim() || null : null; status = { ...status, contentScriptConnected: true, state, threshold: settings.threshold, inventory, inventoryCurrent: inventory.current, inventoryCapacity: inventory.capacity, sellButtonFound: Boolean(snapshot.button), sellButtonReady: snapshot.ready, cooldownText, sellButtonDisabled: disabled, sellButtonClasses: snapshot.button ? [...snapshot.button.classList] : [], cooldownDetected: cooldown, sellButton: { found: Boolean(snapshot.button), ready: snapshot.ready, disabled, classes: snapshot.button ? [...snapshot.button.classList] : [], cooldownText }, confirmationFound: Boolean(snapshot.modal), activeCycle: cycleActive, clickGuardRemainingMs: Math.max(0, CLICK_GUARD_MS - (now - lastClickAt)), stateAgeMs: now - stateEnteredAt, lastEvaluationAt: reconciliation ? status.lastEvaluationAt : new Date(now).toISOString(), lastReconciliationAt: reconciliation ? new Date(now).toISOString() : status.lastReconciliationAt }; };
  const staleTransient = (): boolean => { const timeout = TRANSIENT_TIMEOUT_MS[state]; return timeout !== undefined && Date.now() - stateEnteredAt >= timeout; };
  const recover = (): void => { const old = state; cycleActive = false; confirmationAttempted = false; transition('waiting-for-sell-button'); status.lastRecoveryAt = new Date().toISOString(); log('recovered stale transient state'); log(`state reconciled: ${old} -> waiting-for-sell-button`); };
  const reconcile = (): Snapshot | null => {
    if (disposed || !settings.enabled) { cycleActive = false; transition('disabled'); return null; }
    if (!isExtensionRuntimeUsable()) { invalidateContext(); return null; }
    const snapshot = inspect(); updateStatus(snapshot, true);
    if (snapshot.modal) { cycleActive = true; if (!settings.autoConfirm) transition('waiting-for-manual-confirmation'); else if (confirmationAttempted) transition('waiting-for-cooldown'); else transition('waiting-for-confirmation'); return snapshot; }
    confirmationAttempted = false;
    if (snapshot.button && !snapshot.ready) { cycleActive = false; transition('cooldown'); return snapshot; }
    if (!snapshot.inventory || snapshot.inventory.current <= settings.threshold) { cycleActive = false; transition('waiting-for-threshold'); return snapshot; }
    if (!snapshot.button || !snapshot.ready) { cycleActive = false; transition('waiting-for-sell-button'); return snapshot; }
    if (staleTransient()) recover();
    else if (state === 'waiting-for-manual-confirmation' || state === 'error') { cycleActive = false; transition('waiting-for-sell-button'); }
    else if (!cycleActive) transition('waiting-for-sell-button');
    updateStatus(snapshot, true); return snapshot;
  };
  const evaluate = (): void => {
    const snapshot = reconcile(); if (!snapshot || disposed || !settings.enabled) { persist(); return; }
    try {
      if (snapshot.modal) { if (!settings.autoConfirm || confirmationAttempted || !canConfirmSale(snapshot.modal)) { persist(); return; } transition('confirming-sale'); const current = findSaleConfirmation(); if (!settings.enabled || !current || current.card !== snapshot.modal.card || !canConfirmSale(current)) { cycleActive = false; transition('error'); status.lastError = 'Confirmation became invalid'; persist(); return; } if (!isExtensionRuntimeUsable()) { invalidateContext(); return; } current.confirm.click(); confirmationAttempted = true; status.lastConfirmationAt = new Date().toISOString(); transition('waiting-for-cooldown'); updateStatus(inspect(), false); persist(); return; }
      if (!snapshot.inventory || snapshot.inventory.current <= settings.threshold || !snapshot.button || !snapshot.ready) { persist(); return; }
      if (cycleActive && !staleTransient()) { persist(); return; }
      if (Date.now() - lastClickAt < CLICK_GUARD_MS) { persist(); return; }
      const button = readSellButton(); const inventory = readInventory(); const modal = findSaleConfirmation(); if (!isExtensionRuntimeUsable()) { invalidateContext(); return; }
      if (!settings.enabled || modal || !button || !isSellButtonReady(button) || !inventory || inventory.current <= settings.threshold) { updateStatus(inspect(), false); persist(); return; }
      cycleActive = true; transition('opening-sale'); button.click(); lastClickAt = Date.now(); status.lastSellClickAt = new Date(lastClickAt).toISOString(); updateStatus(inspect(), false); persist();
    } catch (error) { cycleActive = false; transition('error'); status.lastError = error instanceof Error ? error.message : String(error); log(`blocked: ${status.lastError}`); persist(); }
  };
  const start = (): void => { if (observer || disposed) return; observer = new MutationObserver(() => { const button = readSellButton(); const next = `${document.querySelector('#inv-count')?.textContent ?? ''}|${button?.disabled}|${button?.className}|${Boolean(findSaleConfirmation())}`; if (next !== signature) { signature = next; schedule(); } }); observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'disabled'] }); safety = setInterval(evaluate, SAFETY_INTERVAL_MS); status.observerRunning = true; status.safetyTimerRunning = true; log('started'); schedule(); persist(); };
  const stopRuntime = (): void => { clearRuntime(); cycleActive = false; confirmationAttempted = false; transition('disabled'); log('stopped'); persist(); };
  const update = (next: ActionSettings['autoSell']): void => { if (contextInvalidated) return; settings = next; status.threshold = next.threshold; if (!next.enabled) stopRuntime(); else { start(); schedule(); } };
  update(initial);
  return { update, evaluate, reconcile: () => { reconcile(); persist(); }, invalidateContext, getState: () => state, stop: () => { if (contextInvalidated) return; disposed = true; stopRuntime(); status.contentScriptConnected = false; persist(); } };
};
