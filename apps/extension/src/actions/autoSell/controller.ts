import { saveActionStatus } from '../../storage/status';
import { canConfirmSale, findSaleConfirmation, isSellButtonReady, readInventory, readSellButton } from './dom';
import type { ActionSettings, ActionStatus, AutoSellState } from './types';

export const CLICK_GUARD_MS = 5_000;
export const DEBOUNCE_MS = 100;
export const SAFETY_INTERVAL_MS = 1_000;
export interface AutoSellController { update(settings: ActionSettings['autoSell']): void; stop(): void; evaluate(): void }

export const createAutoSellController = (initial: ActionSettings['autoSell'], write: (status: ActionStatus) => Promise<void> = saveActionStatus): AutoSellController => {
  let settings = initial; let state: AutoSellState = 'disabled'; let observer: MutationObserver | null = null;
  let debounce: ReturnType<typeof setTimeout> | null = null; let safety: ReturnType<typeof setInterval> | null = null;
  let lastClickAt = 0; let disposed = false; let cycleActive = false; let signature = '';
  let status: ActionStatus = { connected: true, state, inventory: { current: null, capacity: null }, threshold: settings.threshold,
    sellButton: { found: false, ready: false, disabled: false, classes: [], cooldownText: null }, confirmationFound: false,
    lastEvaluation: null, lastSellClick: null, lastConfirmation: null, lastSale: null, lastError: null, logs: [] };
  const persist = (): void => { void write(structuredClone(status)).catch(() => undefined); };
  const log = (message: string): void => { status.logs = [...status.logs, { at: new Date().toISOString(), message }].slice(-50); console.info(`[BIC AutoSell] ${message}`); };
  const transition = (next: AutoSellState): void => { if (state !== next) { log(`state: ${state} -> ${next}`); state = next; status.state = next; } };
  const clearRuntime = (): void => { observer?.disconnect(); observer = null; if (debounce) clearTimeout(debounce); debounce = null; if (safety) clearInterval(safety); safety = null; };
  const schedule = (): void => { if (!settings.enabled || disposed) return; if (debounce) clearTimeout(debounce); debounce = setTimeout(() => { debounce = null; evaluate(); }, DEBOUNCE_MS); };
  const inspect = () => {
    const inventory = readInventory(); const button = readSellButton(); const ready = button ? isSellButtonReady(button) : false; const modal = findSaleConfirmation();
    status = { ...status, connected: true, state, threshold: settings.threshold, inventory: inventory ?? { current: null, capacity: null },
      sellButton: { found: Boolean(button), ready, disabled: Boolean(button && (button.disabled || button.hasAttribute('disabled'))), classes: button ? [...button.classList] : [], cooldownText: button && !ready ? button.textContent?.trim() || null : null },
      confirmationFound: Boolean(modal), lastEvaluation: new Date().toISOString() };
    return { inventory, button, ready, modal };
  };
  const evaluate = (): void => {
    if (disposed || !settings.enabled) return;
    try {
      const { inventory, button, ready, modal } = inspect();
      if (state === 'waiting-for-manual-confirmation') {
        if (modal) { persist(); return; }
        if (button && !ready) { cycleActive = false; status.lastConfirmation = new Date().toISOString(); status.lastSale = status.lastConfirmation; transition('cooldown'); log('cooldown started'); }
        else { cycleActive = false; transition('waiting-for-threshold'); log('blocked: confirmation cancelled'); }
      }
      if (state === 'waiting-for-cooldown' || state === 'confirming-sale') {
        if (button && !ready) { cycleActive = false; status.lastSale = new Date().toISOString(); transition('cooldown'); log('cooldown started'); } else { persist(); return; }
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
        current.confirm.click(); status.lastConfirmation = new Date().toISOString(); log('confirmation click'); transition('waiting-for-cooldown'); persist(); return;
      }
      if (!inventory || inventory.current <= settings.threshold) { cycleActive = false; transition('waiting-for-threshold'); persist(); return; }
      if (!button || !ready) { transition(button ? 'cooldown' : 'waiting-for-sell-button'); persist(); return; }
      if (cycleActive || Date.now() - lastClickAt < CLICK_GUARD_MS) { log('blocked: click guard'); persist(); return; }
      const freshButton = readSellButton(); const freshInventory = readInventory();
      if (!settings.enabled || !freshButton || !isSellButtonReady(freshButton) || !freshInventory || freshInventory.current <= settings.threshold) { log('blocked: DOM changed before click'); persist(); return; }
      cycleActive = true; transition('opening-sale'); freshButton.click(); lastClickAt = Date.now(); status.lastSellClick = new Date(lastClickAt).toISOString(); log('sell click'); persist();
    } catch (error) { cycleActive = false; transition('error'); status.lastError = error instanceof Error ? error.message : String(error); log(`blocked: ${status.lastError}`); persist(); }
  };
  const start = (): void => {
    if (observer || disposed) return;
    observer = new MutationObserver(() => { const inventory = document.querySelector('#inv-count')?.textContent ?? ''; const button = readSellButton(); const modal = findSaleConfirmation(); const next = `${inventory}|${button?.disabled}|${button?.className}|${Boolean(modal)}`; if (next !== signature) { signature = next; schedule(); } });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'disabled'] });
    safety = setInterval(evaluate, SAFETY_INTERVAL_MS); log('started'); schedule(); persist();
  };
  const stopRuntime = (): void => { clearRuntime(); cycleActive = false; transition('disabled'); log('stopped'); persist(); };
  const update = (next: ActionSettings['autoSell']): void => { settings = next; status.threshold = next.threshold; if (!next.enabled) stopRuntime(); else { start(); schedule(); } };
  update(initial);
  return { update, evaluate, stop: () => { disposed = true; stopRuntime(); status.connected = false; persist(); } };
};
