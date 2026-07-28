import { defaultLiveState, type LiveIntegrationState, type LiveSnapshot } from './protocol';

const key = 'companion.live-dom.v1';
const HISTORY_LIMIT = 5;
interface StoredLiveData { version: 1; state: LiveIntegrationState; history: LiveSnapshot[] }

const normalize = (value: unknown): StoredLiveData => {
  if (!value || typeof value !== 'object') return { version: 1, state: defaultLiveState(), history: [] };
  const raw = value as Partial<StoredLiveData>;
  return {
    version: 1,
    state: raw.state && typeof raw.state === 'object' ? raw.state : defaultLiveState(),
    history: Array.isArray(raw.history) ? raw.history.slice(0, HISTORY_LIMIT) : []
  };
};

export const liveStore = {
  async load(): Promise<StoredLiveData> {
    const result = await chrome.storage.local.get(key);
    return normalize(result[key]);
  },
  async saveState(state: LiveIntegrationState): Promise<void> {
    const current = await this.load();
    const history = state.enabled && state.lastSnapshot
      ? [state.lastSnapshot, ...current.history.filter((item) => item.id !== state.lastSnapshot?.id)].slice(0, HISTORY_LIMIT)
      : current.history;
    await chrome.storage.local.set({ [key]: { version: 1, state, history } satisfies StoredLiveData });
  },
  async clearRealData(enabled: boolean): Promise<LiveIntegrationState> {
    const state = { ...defaultLiveState(), enabled, status: enabled ? 'waiting-for-game-tab' as const : 'disabled' as const };
    await chrome.storage.local.set({ [key]: { version: 1, state, history: [] } satisfies StoredLiveData });
    return state;
  }
};
