import { EVALUATION_DEBOUNCE_MS, isSellButtonReady, parseInventoryCount, startAutoSellObserver } from './autoSell';

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
const settle = async (): Promise<void> => { await vi.advanceTimersByTimeAsync(EVALUATION_DEBOUNCE_MS); await Promise.resolve(); };
const changeSettings = (next: Record<string, unknown>): void => {
  const previous = settings; settings = next;
  listeners.forEach((listener) => listener({ 'companion.settings': { oldValue: previous, newValue: next } }, 'local'));
};

describe('automatic sale controller', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-04T12:00:00Z')); listeners.clear(); sent.length = 0; guard = undefined;
    settings = { autoSellEnabled: true, autoSellThreshold: 30 }; installChromeMock(); document.body.innerHTML = '';
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
});
