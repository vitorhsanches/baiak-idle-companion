import { useEffect, useRef, useState } from 'react';
import type { ActionSettings, ActionStatus } from '../actions/autoSell/types';
import { ACTION_SETTINGS_KEY, DEFAULT_ACTION_SETTINGS, loadActionSettings, saveActionSettings } from '../storage/settings';
import { ACTION_STATUS_KEY, emptyActionStatus, loadActionStatus } from '../storage/status';

type Page = 'AUTOMATIONS' | 'SETTINGS' | 'DEBUG';
const STATUS_STALE_MS = 3_000;
const stateLabel: Record<ActionStatus['state'], string> = {
  disabled: 'Disabled', 'waiting-for-threshold': 'Waiting', 'waiting-for-sell-button': 'Waiting', 'opening-sale': 'Selling',
  'waiting-for-confirmation': 'Selling', 'waiting-for-manual-confirmation': 'Waiting', 'confirming-sale': 'Selling',
  'waiting-for-cooldown': 'Selling', cooldown: 'Cooldown', error: 'Error'
};
const value = (input: string | null): string => input ?? 'Never';

export function App() {
  const [page, setPage] = useState<Page>('AUTOMATIONS');
  const [settings, setSettings] = useState<ActionSettings>(DEFAULT_ACTION_SETTINGS);
  const [status, setStatus] = useState<ActionStatus>(emptyActionStatus());
  const [connected, setConnected] = useState(false);
  const statusRef = useRef(status);
  useEffect(() => {
    const applyStatus = (nextStatus: ActionStatus): void => {
      statusRef.current = nextStatus; setStatus(nextStatus);
      setConnected(nextStatus.contentScriptConnected && Date.now() - Date.parse(nextStatus.updatedAt) <= STATUS_STALE_MS);
    };
    void Promise.all([loadActionSettings(), loadActionStatus()]).then(([nextSettings, nextStatus]) => { setSettings(nextSettings); applyStatus(nextStatus); });
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
      if (area !== 'local') return;
      if (changes[ACTION_SETTINGS_KEY]?.newValue) setSettings(changes[ACTION_SETTINGS_KEY].newValue as ActionSettings);
      if (changes[ACTION_STATUS_KEY]?.newValue) applyStatus(changes[ACTION_STATUS_KEY].newValue as ActionStatus);
    };
    chrome.storage.onChanged.addListener(listener);
    const clock = window.setInterval(() => { const current = statusRef.current; setConnected(current.contentScriptConnected && Date.now() - Date.parse(current.updatedAt) <= STATUS_STALE_MS); }, 1_000);
    return () => { window.clearInterval(clock); chrome.storage.onChanged.removeListener(listener); };
  }, []);
  const updateAutoSell = (patch: Partial<ActionSettings['autoSell']>): void => {
    const next = { ...settings, autoSell: { ...settings.autoSell, ...patch } }; setSettings(next); void saveActionSettings(next);
  };
  const stopAll = (): void => updateAutoSell({ enabled: false });
  return <div className="app">
    <aside><div className="brand"><b>B</b><span>Baiak<br/><strong>Companion</strong></span></div><nav>{(['AUTOMATIONS', 'SETTINGS', 'DEBUG'] as Page[]).map((item) => <button key={item} aria-current={page === item ? 'page' : undefined} onClick={() => setPage(item)}>{item}</button>)}</nav><footer>LOCAL · ACTION-FIRST</footer></aside>
    <main>
      {page === 'AUTOMATIONS' && <><header><small>AUTOMATIONS</small><h1>Auto Sell</h1></header><section className="card settings">
        <label><span>Enable Auto Sell</span><input aria-label="Enable Auto Sell" type="checkbox" checked={settings.autoSell.enabled} onChange={(event) => updateAutoSell({ enabled: event.target.checked })}/></label>
        <label><span>Confirm sales automatically</span><input aria-label="Confirm sales automatically" type="checkbox" checked={settings.autoSell.autoConfirm} onChange={(event) => updateAutoSell({ autoConfirm: event.target.checked })}/></label>
        <label><span>Threshold</span><input aria-label="Threshold" type="number" min="0" step="1" value={settings.autoSell.threshold} onChange={(event) => updateAutoSell({ threshold: Math.max(0, Math.floor(Number(event.target.value) || 0)) })}/></label>
        <dl><div><dt>Status</dt><dd>{connected ? stateLabel[status.state] : 'Disconnected'}</dd></div><div><dt>Inventory</dt><dd>{connected ? `${status.inventoryCurrent ?? '—'} / ${status.inventoryCapacity ?? '—'}` : '— / —'}</dd></div><div><dt>Sell button</dt><dd>{!connected || !status.sellButtonFound ? 'Not found' : status.sellButtonReady ? 'Ready' : 'Cooldown'}</dd></div><div><dt>Cooldown</dt><dd>{connected ? status.cooldownText ?? '—' : '—'}</dd></div><div><dt>Last sale</dt><dd>{value(status.lastSaleAt)}</dd></div></dl>
      </section><button className="danger" onClick={stopAll}>STOP ALL AUTOMATIONS</button></>}
      {page === 'SETTINGS' && <><header><small>SETTINGS</small><h1>Local settings</h1></header><section className="card"><p>Settings and operational status are stored separately in chrome.storage.local.</p></section><button className="danger" onClick={stopAll}>STOP ALL AUTOMATIONS</button></>}
      {page === 'DEBUG' && <><header><small>DEBUG</small><h1>Action diagnostics</h1></header><section className="card debug"><dl>
        <div><dt>Content script</dt><dd>{connected ? 'Connected' : 'Not connected'}</dd></div><div><dt>State</dt><dd>{status.state}</dd></div><div><dt>Settings</dt><dd>enabled: {String(settings.autoSell.enabled)} · autoConfirm: {String(settings.autoSell.autoConfirm)} · threshold: {settings.autoSell.threshold}</dd></div><div><dt>Inventory</dt><dd>{status.inventoryCurrent ?? '—'} / {status.inventoryCapacity ?? '—'}</dd></div><div><dt>Sell button</dt><dd>found: {String(status.sellButtonFound)} · ready: {String(status.sellButtonReady)} · classes: {status.sellButton.classes.join(' ') || 'none'}</dd></div><div><dt>Confirmation</dt><dd>{status.confirmationFound ? 'found' : 'not found'}</dd></div><div><dt>Runtime</dt><dd>observer: {status.observerRunning ? 'running' : 'stopped'} · safety timer: {status.safetyTimerRunning ? 'running' : 'stopped'}</dd></div><div><dt>Last evaluation</dt><dd>{value(status.lastEvaluationAt)}</dd></div><div><dt>Last sell click</dt><dd>{value(status.lastSellClickAt)}</dd></div><div><dt>Last confirmation</dt><dd>{value(status.lastConfirmationAt)}</dd></div><div><dt>Last sale</dt><dd>{value(status.lastSaleAt)}</dd></div><div><dt>Last error</dt><dd>{value(status.lastError)}</dd></div>
        <div><dt>Reconciliation</dt><dd>entered: {status.stateEnteredAt} · age: {status.stateAgeMs}ms · last: {value(status.lastReconciliationAt)} · recovery: {value(status.lastRecoveryAt)}</dd></div><div><dt>Cycle</dt><dd>active: {String(status.activeCycle)} · guard: {status.clickGuardRemainingMs}ms · cooldown: {String(status.cooldownDetected)}</dd></div><div><dt>Button details</dt><dd>disabled: {String(status.sellButtonDisabled)} · classes: {status.sellButtonClasses.join(' ') || 'none'}</dd></div>
      </dl></section></>}
    </main>
  </div>;
}
