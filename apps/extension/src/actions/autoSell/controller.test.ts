import { createAutoSellController, CLICK_GUARD_MS, DEBOUNCE_MS, SAFETY_INTERVAL_MS } from './controller';
import type { ActionStatus, AutoSellSettings } from './types';

let statuses: ActionStatus[]; let controller: ReturnType<typeof createAutoSellController> | undefined;
const defaults: AutoSellSettings = { enabled: true, autoConfirm: false, threshold: 30 };
const renderGame = (count = '31 / 32', button = '<button id="sell-all">venda</button>'): HTMLButtonElement | null => { document.body.innerHTML = `<b id="inv-count">${count}</b>${button}`; return document.querySelector('#sell-all'); };
const modal = (title = 'Vender tudo', attributes = ''): HTMLButtonElement => { const card = document.createElement('div'); card.className = 'im-card'; card.innerHTML = `<div id="confirm-modal-body"><div class="sell-sum-head">${title}</div></div><div class="confirm-actions"><button id="confirm-yes" ${attributes}>Vender tudo</button><button id="confirm-no">Cancelar</button></div>`; document.body.append(card); return card.querySelector('#confirm-yes')!; };
const start = (settings: Partial<AutoSellSettings> = {}) => { controller = createAutoSellController({ ...defaults, ...settings }, async (status) => { statuses.push(status); }); return controller; };
const run = () => { controller?.evaluate(); };
const state = () => statuses.at(-1)?.state;

describe('AutoSell controller', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-09T12:00:00Z')); statuses = []; document.body.innerHTML = ''; Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { runtime: { id: 'test-extension' } } }); vi.spyOn(console, 'info').mockImplementation(() => undefined); vi.spyOn(console, 'error').mockImplementation(() => undefined); vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList); });
  afterEach(() => { controller?.stop(); controller = undefined; vi.restoreAllMocks(); vi.useRealTimers(); });
  it('1 disabled does not click', () => { const button = renderGame(); const click = vi.spyOn(button!, 'click'); start({ enabled: false }); run(); expect(click).not.toHaveBeenCalled(); });
  it('2 equal threshold does not sell', () => { const button = renderGame('30 / 32'); const click = vi.spyOn(button!, 'click'); start(); run(); expect(click).not.toHaveBeenCalled(); expect(state()).toBe('waiting-for-threshold'); });
  it('3 above threshold sells', () => { const button = renderGame(); const click = vi.spyOn(button!, 'click'); start(); run(); expect(click).toHaveBeenCalledOnce(); });
  it('4 cooldown does not sell', () => { const button = renderGame('32 / 32', '<button id="sell-all" class="cd" disabled>1:16</button>'); const click = vi.spyOn(button!, 'click'); start(); run(); expect(click).not.toHaveBeenCalled(); });
  it('5 absent button does not sell', () => { renderGame('32 / 32', ''); start(); run(); expect(state()).toBe('waiting-for-sell-button'); });
  it('6 disabled button does not sell', () => { const button = renderGame('32 / 32', '<button id="sell-all" disabled>1:16</button>'); const click = vi.spyOn(button!, 'click'); start(); run(); expect(click).not.toHaveBeenCalled(); });
  it('7 cd button does not sell', () => { const button = renderGame('32 / 32', '<button id="sell-all" class="cd">1:16</button>'); const click = vi.spyOn(button!, 'click'); start(); run(); expect(click).not.toHaveBeenCalled(); });
  it('8 repeated evaluations click once', () => { const button = renderGame(); const click = vi.spyOn(button!, 'click'); start(); run(); run(); run(); expect(click).toHaveBeenCalledOnce(); });
  it('9 manual mode opens but does not confirm', () => { const button = renderGame(); start(); run(); const confirm = modal(); const click = vi.spyOn(confirm, 'click'); run(); expect(click).not.toHaveBeenCalled(); expect(state()).toBe('waiting-for-manual-confirmation'); expect(button).toBeTruthy(); });
  it('10 auto confirm clicks correct modal', () => { renderGame(); start({ autoConfirm: true }); run(); const confirm = modal(); const click = vi.spyOn(confirm, 'click'); run(); expect(click).toHaveBeenCalledOnce(); });
  it('11 wrong modal is not confirmed', () => { renderGame(); start({ autoConfirm: true }); run(); const confirm = modal('Discard item'); const click = vi.spyOn(confirm, 'click'); run(); expect(click).not.toHaveBeenCalled(); });
  it.each(['hidden', 'disabled'])('12 confirm %s is not clicked', (attribute) => { renderGame(); start({ autoConfirm: true }); run(); const confirm = modal('Vender tudo', attribute); const click = vi.spyOn(confirm, 'click'); run(); expect(click).not.toHaveBeenCalled(); expect(state()).toBe('error'); });
  it('13 manual cancellation rearms', () => { renderGame(); start(); run(); modal(); run(); document.querySelector('.im-card')?.remove(); run(); expect(state()).toBe('waiting-for-threshold'); });
  it('14 manual confirmation enters cooldown', () => { const button = renderGame()!; start(); run(); modal(); run(); document.querySelector('.im-card')?.remove(); button.disabled = true; run(); expect(state()).toBe('cooldown'); });
  it('15 automatic confirmation enters cooldown', () => { const button = renderGame()!; start({ autoConfirm: true }); run(); modal(); run(); button.disabled = true; run(); expect(state()).toBe('cooldown'); });
  it('16 cooldown blocks a sale', () => { const button = renderGame()!; start({ autoConfirm: true }); run(); modal(); run(); button.disabled = true; run(); const click = vi.spyOn(button, 'click'); run(); expect(click).not.toHaveBeenCalled(); });
  it('17 cooldown ends high and sells again', () => { const button = renderGame()!; const click = vi.spyOn(button, 'click'); start({ autoConfirm: true }); run(); modal(); run(); button.disabled = true; run(); vi.advanceTimersByTime(CLICK_GUARD_MS); button.disabled = false; document.querySelector('.im-card')?.remove(); run(); expect(click).toHaveBeenCalledTimes(2); });
  it('18 cooldown ends low and waits', () => { const button = renderGame()!; start({ autoConfirm: true }); run(); modal(); run(); button.disabled = true; run(); button.disabled = false; document.querySelector('.im-card')?.remove(); document.querySelector('#inv-count')!.textContent = '20 / 32'; run(); expect(state()).toBe('waiting-for-threshold'); });
  it('19 later threshold crossing sells', () => { const button = renderGame('20 / 32')!; const click = vi.spyOn(button, 'click'); start(); run(); document.querySelector('#inv-count')!.textContent = '31 / 32'; run(); expect(click).toHaveBeenCalledOnce(); });
  it('20 inventory high then cooldown ends sells', () => { const button = renderGame('32 / 32', '<button id="sell-all" disabled>1:00</button>')!; const click = vi.spyOn(button, 'click'); start(); run(); button.disabled = false; run(); expect(click).toHaveBeenCalledOnce(); });
  it.each([2, 3])('%i complete consecutive sales', (cycles) => { const button = renderGame()!; const click = vi.spyOn(button, 'click'); start({ autoConfirm: true }); run(); for (let index = 0; index < cycles; index += 1) { modal(); run(); button.disabled = true; run(); document.querySelector('.im-card')?.remove(); if (index < cycles - 1) { vi.advanceTimersByTime(CLICK_GUARD_MS); button.disabled = false; run(); } } expect(click).toHaveBeenCalledTimes(cycles); });
  it('23 stop all interrupts everything', () => { const button = renderGame()!; const click = vi.spyOn(button, 'click'); const active = start(); active.update({ ...defaults, enabled: false }); vi.advanceTimersByTime(SAFETY_INTERVAL_MS * 2); expect(click).not.toHaveBeenCalled(); expect(state()).toBe('disabled'); });
  it('24 one controller creates one timer path', () => { renderGame(); start(); vi.advanceTimersByTime(DEBOUNCE_MS); const first = statuses.length; vi.advanceTimersByTime(SAFETY_INTERVAL_MS); expect(statuses.length).toBeGreaterThan(first); controller?.stop(); const stoppedCount = statuses.length; vi.advanceTimersByTime(SAFETY_INTERVAL_MS * 2); expect(statuses).toHaveLength(stoppedCount); });
  it('25 click error does not permanently lock', () => { const button = renderGame()!; const click = vi.spyOn(button, 'click').mockImplementationOnce(() => { throw new Error('boom'); }); start(); run(); expect(state()).toBe('error'); vi.advanceTimersByTime(CLICK_GUARD_MS); run(); expect(click).toHaveBeenCalledTimes(2); expect(state()).not.toBe('error'); });
  it('26 replaced DOM elements still work', () => { const old = renderGame()!; const oldClick = vi.spyOn(old, 'click'); start(); run(); expect(oldClick).toHaveBeenCalledOnce(); vi.advanceTimersByTime(CLICK_GUARD_MS); renderGame('32 / 32'); const fresh = document.querySelector<HTMLButtonElement>('#sell-all')!; const freshClick = vi.spyOn(fresh, 'click'); controller?.update({ ...defaults, enabled: false }); controller?.update(defaults); run(); expect(freshClick).toHaveBeenCalledOnce(); });
  it('stops all recurring work when status storage reports context invalidation', async () => {
    renderGame(); const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect'); let writes = 0;
    controller = createAutoSellController(defaults, async () => { writes += 1; throw new Error('Extension context invalidated.'); });
    await Promise.resolve(); await Promise.resolve();
    expect(controller.getState()).toBe('disabled'); expect(disconnect).toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    const writesBeforeAdvance = writes; vi.advanceTimersByTime(SAFETY_INTERVAL_MS * 3 + DEBOUNCE_MS);
    expect(writes).toBe(writesBeforeAdvance); expect(console.info).toHaveBeenCalledWith('[BIC] extension context invalidated; controller stopped');
    controller.invalidateContext(); controller.evaluate();
    expect(console.info).toHaveBeenCalledWith('[BIC] extension context invalidated; controller stopped');
    expect(vi.mocked(console.info).mock.calls.filter(([message]) => message === '[BIC] extension context invalidated; controller stopped')).toHaveLength(1);
  });
  it('surfaces ordinary storage failures without stopping the controller', async () => {
    renderGame(); const error = new Error('storage unavailable'); let firstWrite = true;
    controller = createAutoSellController(defaults, async () => { if (firstWrite) { firstWrite = false; throw error; } });
    await Promise.resolve(); await Promise.resolve();
    expect(vi.getTimerCount()).toBeGreaterThan(0); expect(console.error).toHaveBeenCalledWith('[BIC AutoSell] status persistence failed', error);
  });
});
