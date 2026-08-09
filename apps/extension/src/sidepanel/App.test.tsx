import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
const listeners = new Set<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>();
const store: Record<string, unknown> = {};
beforeEach(() => { listeners.clear(); Object.keys(store).forEach((key) => delete store[key]); Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: { local: { get: vi.fn(async (key: string) => ({ [key]: store[key] })), set: vi.fn(async (values: Record<string, unknown>) => { Object.assign(store, values); }) }, onChanged: { addListener: (listener: typeof listeners extends Set<infer T> ? T : never) => listeners.add(listener), removeListener: (listener: typeof listeners extends Set<infer T> ? T : never) => listeners.delete(listener) } } } }); });
describe('side panel', () => {
  it('shows only action-first navigation', async () => { render(<App/>); expect(await screen.findByRole('heading', { name: 'Auto Sell' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'AUTOMATIONS' })).toBeInTheDocument(); expect(screen.queryByText('Hunts')).not.toBeInTheDocument(); });
  it('persists stop all through action settings', async () => { const user = userEvent.setup(); render(<App/>); await user.click(screen.getByLabelText('Enable Auto Sell')); await user.click(screen.getByRole('button', { name: 'STOP ALL AUTOMATIONS' })); expect(store['companion.actions.settings']).toEqual({ autoSell: { enabled: false, autoConfirm: false, threshold: 30 } }); });
  it('opens debug diagnostics', async () => { render(<App/>); await userEvent.click(screen.getByRole('button', { name: 'DEBUG' })); expect(screen.getByRole('heading', { name: 'Action diagnostics' })).toBeInTheDocument(); expect(screen.getByText('Not connected')).toBeInTheDocument(); });
});
