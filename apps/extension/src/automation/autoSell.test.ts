import { CLICK_GUARD_MS, CONFIRMATION_TIMEOUT_MS, COOLDOWN_TIMEOUT_MS, EVALUATION_DEBOUNCE_MS, isSellButtonReady, parseInventoryCount, startAutoSellObserver } from './autoSell';

const listeners = new Set<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>();
let settings: Record<string, unknown>;
let guard: number | undefined;
const sent: unknown[] = [];
const installChromeMock = (): void => {
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: {
    storage: { local: {
      get: vi.fn(async (key: string) => key === 'companion.settings' ? { [key]: settings } : { [key]: guard }),
      set: vi.fn(async (values: Record<string, unknown>) => { if (typeof values['companion.auto-sell.last-click-at'] === 'number') guard = values['companion.auto-sell.last-click-at']; })
    }, onChanged: {
      addListener: vi.fn((listener) => listeners.add(listener)), removeListener: vi.fn((listener) => listeners.delete(listener))
    } }, runtime: { sendMessage: vi.fn(async (message: unknown) => { sent.push(message); }) }
  } });
};
const renderGame = (count = '31 / 32', button = '<button id="sell-all">venda</button>'): HTMLButtonElement | null => {
  document.body.innerHTML = `<b id="inv-count">${count}</b>${button}`;
  return document.querySelector<HTMLButtonElement>('#sell-all');
};
const createModal = (title = 'Vender tudo', options: { hidden?: boolean; disabled?: boolean } = {}) => {
  const card = document.createElement('div'); card.className = 'im-card';
  card.innerHTML = `<div id="confirm-modal-body"><div class="sell-sum"><div class="sell-sum-head">${title}</div></div></div><div class="confirm-actions"><button id="confirm-yes" ${options.disabled ? 'disabled' : ''}>Vender tudo</button><button id="confirm-no">Cancelar</button></div>`;
  const confirm = card.querySelector<HTMLButtonElement>('#confirm-yes')!; confirm.hidden = options.hidden ?? false;
  return { card, confirm };
};
const settle = async (): Promise<void> => { await vi.advanceTimersByTimeAsync(EVALUATION_DEBOUNCE_MS); await Promise.resolve(); };
const changeSettings = (next: Record<string, unknown>): void => {
  const previous = settings; settings = next;
  listeners.forEach((listener) => listener({ 'companion.settings': { oldValue: previous, newValue: next } }, 'local'));
};

describe('automatic sale controller', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-04T12:00:00Z')); listeners.clear(); sent.length = 0; guard = undefined;
    settings = { autoSellEnabled: true, autoSellThreshold: 30 }; installChromeMock(); document.body.innerHTML = '';
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue({ length: 1 } as DOMRectList);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it.each([['30 / 32', 30], ['31 / 32', 31], [' 32 / 40 ', 32]])('parses %s', (value, expected) => expect(parseInventoryCount(value)).toBe(expected));
  it.each([null, '', '32', 'x / 32', '1.5 / 32'])('rejects invalid count %s', (value) => expect(parseInventoryCount(value)).toBeNull());
  it('rejects disabled and cooldown buttons', () => {
    const button = document.createElement('button'); expect(isSellButtonReady(button)).toBe(true);
    button.disabled = true; expect(isSellButtonReady(button)).toBe(false);
    button.disabled = false; button.classList.add('cd'); expect(isSellButtonReady(button)).toBe(false);
  });
  it.each([
    ['30 / 32', '<button id="sell-all">venda</button>'],
    ['invalid', '<button id="sell-all">venda</button>'],
    ['32 / 32', ''],
    ['32 / 32', '<button id="sell-all" disabled>1:16</button>'],
    ['32 / 32', '<button id="sell-all" class="cd">1:16</button>']
  ])('does not click when a condition fails', async (count, markup) => {
    const button = renderGame(count, markup); const click = button ? vi.spyOn(button, 'click') : undefined;
    const stop = startAutoSellObserver(); await settle(); if (click) expect(click).not.toHaveBeenCalled(); stop();
  });
  it('does not click while disabled', async () => {
    settings.autoSellEnabled = false; const click = vi.spyOn(renderGame()!, 'click'); const stop = startAutoSellObserver();
    await settle(); expect(click).not.toHaveBeenCalled(); stop();
  });
  it('clicks only once for a burst of mutations', async () => {
    const button = renderGame(); const click = vi.spyOn(button!, 'click'); const stop = startAutoSellObserver();
    document.querySelector('#inv-count')!.textContent = '32 / 32'; document.querySelector('#inv-count')!.textContent = '31 / 32';
    await settle(); expect(click).toHaveBeenCalledOnce(); await vi.advanceTimersByTimeAsync(2_000); expect(click).toHaveBeenCalledOnce(); stop();
  });
  it('applies a changed threshold', async () => {
    settings.autoSellThreshold = 31; const click = vi.spyOn(renderGame('31 / 32')!, 'click'); const stop = startAutoSellObserver();
    await settle(); expect(click).not.toHaveBeenCalled(); changeSettings({ autoSellEnabled: true, autoSellThreshold: 30 });
    await settle(); expect(click).toHaveBeenCalledOnce(); stop();
  });
  it('detects companion.settings and starts the observer when enabled', async () => {
    settings.autoSellEnabled = false; const click = vi.spyOn(renderGame('32 / 32')!, 'click'); const stop = startAutoSellObserver();
    await settle(); expect(click).not.toHaveBeenCalled(); changeSettings({ autoSellEnabled: true, autoSellThreshold: 30 });
    await settle(); expect(click).toHaveBeenCalledOnce();
    expect(sent.some((message) => (message as { payload?: { observerRunning?: boolean } }).payload?.observerRunning === true)).toBe(true); stop();
  });
  it('performs the initial evaluation with true and threshold 30', async () => {
    const click = vi.spyOn(renderGame('32 / 32')!, 'click'); const stop = startAutoSellObserver();
    await settle(); expect(click).toHaveBeenCalledOnce(); stop();
  });
  it('does not let liveDomEnabled interfere', async () => {
    settings = { autoSellEnabled: true, autoSellThreshold: 30, liveDomEnabled: false };
    const click = vi.spyOn(renderGame('32 / 32')!, 'click'); const stop = startAutoSellObserver();
    await settle(); expect(click).toHaveBeenCalledOnce(); stop();
  });
  it('does not duplicate the listener or observer on repeated settings changes', async () => {
    settings.autoSellEnabled = false; renderGame('30 / 32'); const stop = startAutoSellObserver(); await settle();
    expect(listeners.size).toBe(1); changeSettings({ autoSellEnabled: true, autoSellThreshold: 30 });
    changeSettings({ autoSellEnabled: true, autoSellThreshold: 31 }); await settle();
    expect(listeners.size).toBe(1); stop();
  });
  it('stops the observer when disabled', async () => {
    renderGame('30 / 32'); const stop = startAutoSellObserver(); await settle();
    changeSettings({ autoSellEnabled: false, autoSellThreshold: 30 }); await settle();
    const latest = sent.at(-1) as { payload?: { observerRunning?: boolean; enabled?: boolean } };
    expect(latest.payload).toMatchObject({ observerRunning: false, enabled: false }); stop();
  });
  it('preserves the five-second guard across controller reloads', async () => {
    const click = vi.spyOn(renderGame()!, 'click'); const firstStop = startAutoSellObserver(); await settle(); firstStop();
    const secondStop = startAutoSellObserver(); await settle(); expect(click).toHaveBeenCalledOnce(); secondStop();
  });
  it('cleans up observers, storage listener and timers', async () => {
    const click = vi.spyOn(renderGame()!, 'click'); const stop = startAutoSellObserver(); stop();
    document.querySelector('#inv-count')!.textContent = '32 / 32'; await settle(); expect(click).not.toHaveBeenCalled(); expect(listeners.size).toBe(0);
  });

  it('does not confirm when autoConfirmSale is false', async () => {
    settings.autoConfirmSale = false; const sell = renderGame('32 / 32')!; const modal = createModal();
    const confirm = vi.spyOn(modal.confirm, 'click'); vi.spyOn(sell, 'click').mockImplementation(() => document.body.append(modal.card));
    const stop = startAutoSellObserver(); await settle(); expect(confirm).not.toHaveBeenCalled();
    expect(sent.some((message) => (message as { payload?: { confirmationState?: string } }).payload?.confirmationState === 'waiting-for-manual-confirmation')).toBe(true); stop();
  });
  it('confirms the correct modal and ends on cooldown', async () => {
    settings.autoConfirmSale = true; const sell = renderGame('32 / 32')!; const modal = createModal();
    vi.spyOn(sell, 'click').mockImplementation(() => document.body.append(modal.card));
    const confirm = vi.spyOn(modal.confirm, 'click').mockImplementation(() => { sell.disabled = true; sell.classList.add('cd'); });
    const stop = startAutoSellObserver(); await settle(); expect(confirm).toHaveBeenCalledOnce();
    expect(sent.some((message) => (message as { payload?: { confirmationState?: string } }).payload?.confirmationState === 'sale-confirmed-visually')).toBe(true); stop();
  });
  it.each([
    ['another title', createModal('Excluir item')],
    ['hidden button', createModal('Vender tudo', { hidden: true })],
    ['disabled button', createModal('Vender tudo', { disabled: true })]
  ])('does not confirm a rejected modal: %s', async (_label, modal) => {
    settings.autoConfirmSale = true; const sell = renderGame('32 / 32')!; const confirm = vi.spyOn(modal.confirm, 'click');
    vi.spyOn(sell, 'click').mockImplementation(() => document.body.append(modal.card)); const stop = startAutoSellObserver();
    await settle(); await vi.advanceTimersByTimeAsync(CONFIRMATION_TIMEOUT_MS); expect(confirm).not.toHaveBeenCalled(); stop();
  });
  it('does not use a confirmation button outside the validated card', async () => {
    settings.autoConfirmSale = true; const sell = renderGame('32 / 32')!; const modal = createModal(); modal.confirm.remove();
    const outside = document.createElement('button'); outside.id = 'confirm-yes'; outside.textContent = 'Vender tudo'; const confirm = vi.spyOn(outside, 'click');
    vi.spyOn(sell, 'click').mockImplementation(() => { document.body.append(modal.card, outside); }); const stop = startAutoSellObserver();
    await settle(); await vi.advanceTimersByTimeAsync(CONFIRMATION_TIMEOUT_MS); expect(confirm).not.toHaveBeenCalled(); stop();
  });
  it('dispatches one confirmation for multiple mutations', async () => {
    settings.autoConfirmSale = true; const sell = renderGame('32 / 32')!; const modal = createModal();
    vi.spyOn(sell, 'click').mockImplementation(() => document.body.append(modal.card));
    const confirm = vi.spyOn(modal.confirm, 'click').mockImplementation(() => { sell.disabled = true; }); const stop = startAutoSellObserver();
    await settle(); modal.card.classList.add('one'); modal.card.classList.add('two'); await settle(); expect(confirm).toHaveBeenCalledOnce(); stop();
  });
  it('prevents confirmation when disabled while waiting for the modal', async () => {
    settings.autoConfirmSale = true; const sell = renderGame('32 / 32')!; const modal = createModal(); const confirm = vi.spyOn(modal.confirm, 'click');
    vi.spyOn(sell, 'click').mockImplementation(() => { setTimeout(() => document.body.append(modal.card), 1_000); }); const stop = startAutoSellObserver();
    await settle(); changeSettings({ autoSellEnabled: false, autoSellThreshold: 30, autoConfirmSale: true });
    await vi.advanceTimersByTimeAsync(1_000); expect(confirm).not.toHaveBeenCalled(); stop();
  });
  it('reports timeout when the confirmation modal is absent', async () => {
    settings.autoConfirmSale = true; renderGame('32 / 32'); const stop = startAutoSellObserver(); await settle();
    await vi.advanceTimersByTimeAsync(CONFIRMATION_TIMEOUT_MS);
    expect(sent.some((message) => (message as { payload?: { confirmationState?: string } }).payload?.confirmationState === 'confirmation-timeout')).toBe(true); stop();
  });
  it('does not repeat a sale when cooldown is absent', async () => {
    settings.autoConfirmSale = true; const sell = renderGame('32 / 32')!; const modal = createModal(); const sellClick = vi.spyOn(sell, 'click').mockImplementation(() => document.body.append(modal.card));
    const confirm = vi.spyOn(modal.confirm, 'click'); const stop = startAutoSellObserver(); await settle();
    await vi.advanceTimersByTimeAsync(COOLDOWN_TIMEOUT_MS + CLICK_GUARD_MS); expect(confirm).toHaveBeenCalledOnce(); expect(sellClick).toHaveBeenCalledOnce();
    expect(sent.some((message) => (message as { payload?: { confirmationState?: string } }).payload?.confirmationState === 'sale-result-unconfirmed')).toBe(true); stop();
  });
  it('cleans confirmation observer and timeout on controller cleanup', async () => {
    settings.autoConfirmSale = true; renderGame('32 / 32'); const stop = startAutoSellObserver(); await settle(); stop();
    const count = sent.length; await vi.advanceTimersByTimeAsync(CONFIRMATION_TIMEOUT_MS + COOLDOWN_TIMEOUT_MS); expect(sent).toHaveLength(count); expect(listeners.size).toBe(0);
  });
  it('rearms after cooldown and completes two consecutive sales', async () => {
    settings.autoConfirmSale = true; const sell = renderGame('32 / 32')!; const confirmClicks = vi.fn();
    const sellClick = vi.spyOn(sell, 'click').mockImplementation(() => {
      const modal = createModal(); document.body.append(modal.card);
      vi.spyOn(modal.confirm, 'click').mockImplementation(() => { confirmClicks(); modal.card.remove(); sell.disabled = true; sell.classList.add('cd'); });
    });
    const stop = startAutoSellObserver(); await settle();
    expect(sellClick).toHaveBeenCalledOnce(); expect(confirmClicks).toHaveBeenCalledOnce();
    const cooldownStatus = sent.at(-1) as { payload?: { saleInProgress?: boolean; cooldownActive?: boolean; observerRunning?: boolean } };
    expect(cooldownStatus.payload).toMatchObject({ saleInProgress: false, cooldownActive: true, observerRunning: true });
    await vi.advanceTimersByTimeAsync(CLICK_GUARD_MS); sell.disabled = false; sell.classList.remove('cd'); await settle();
    expect(sellClick).toHaveBeenCalledTimes(2); expect(confirmClicks).toHaveBeenCalledTimes(2); stop();
  });
  it('does not start a second sale below threshold after cooldown', async () => {
    settings.autoConfirmSale = true; const sell = renderGame('32 / 32')!;
    const sellClick = vi.spyOn(sell, 'click').mockImplementation(() => {
      const modal = createModal(); document.body.append(modal.card);
      vi.spyOn(modal.confirm, 'click').mockImplementation(() => { modal.card.remove(); sell.disabled = true; });
    });
    const stop = startAutoSellObserver(); await settle(); document.querySelector('#inv-count')!.textContent = '30 / 32';
    await vi.advanceTimersByTimeAsync(CLICK_GUARD_MS); sell.disabled = false; await settle(); expect(sellClick).toHaveBeenCalledOnce(); stop();
  });
  it('detects a replacement sell button and ignores cooldown timer text churn', async () => {
    settings.autoConfirmSale = true; const first = renderGame('32 / 32')!; const info = vi.spyOn(console, 'info');
    vi.spyOn(first, 'click').mockImplementation(() => {
      const modal = createModal(); document.body.append(modal.card);
      vi.spyOn(modal.confirm, 'click').mockImplementation(() => { modal.card.remove(); first.disabled = true; first.classList.add('cd'); });
    });
    const stop = startAutoSellObserver(); await settle();
    const evaluations = () => info.mock.calls.filter(([message]) => message === '[AutoSell] evaluation started').length;
    const beforeChurn = evaluations(); first.textContent = '0:03'; first.textContent = '0:02'; first.textContent = '0:01'; await settle();
    expect(evaluations()).toBe(beforeChurn);
    await vi.advanceTimersByTimeAsync(CLICK_GUARD_MS);
    const replacement = document.createElement('button'); replacement.id = 'sell-all'; replacement.textContent = 'venda';
    const replacementClick = vi.spyOn(replacement, 'click').mockImplementation(() => {
      const modal = createModal(); document.body.append(modal.card);
      vi.spyOn(modal.confirm, 'click').mockImplementation(() => { modal.card.remove(); replacement.disabled = true; });
    });
    first.replaceWith(replacement); await settle(); expect(replacementClick).toHaveBeenCalledOnce(); stop();
  });
  it('does not rearm when auto sell is disabled during cooldown', async () => {
    settings.autoConfirmSale = true; const sell = renderGame('32 / 32')!;
    const sellClick = vi.spyOn(sell, 'click').mockImplementation(() => {
      const modal = createModal(); document.body.append(modal.card);
      vi.spyOn(modal.confirm, 'click').mockImplementation(() => { modal.card.remove(); sell.disabled = true; });
    });
    const stop = startAutoSellObserver(); await settle(); changeSettings({ autoSellEnabled: false, autoSellThreshold: 30, autoConfirmSale: true });
    await vi.advanceTimersByTimeAsync(CLICK_GUARD_MS); sell.disabled = false; await settle(); expect(sellClick).toHaveBeenCalledOnce(); stop();
  });
});
