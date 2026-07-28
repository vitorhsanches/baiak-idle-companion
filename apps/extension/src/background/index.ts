import {
  createMessage, GAME_ORIGIN, GAME_PATH_PREFIX, isLiveMessage, MAX_MESSAGE_BYTES,
  messageSize, type LiveIntegrationState, type LiveMessage
} from '../integration/protocol';
import { liveStore } from '../integration/storage';
let gameTabId: number | undefined;

const notifyPanels = async (state: LiveIntegrationState): Promise<void> => {
  try { await chrome.runtime.sendMessage(createMessage('integration-state', 'background', state)); } catch { /* side panel closed */ }
};

const contentSenderIsExpected = (sender: chrome.runtime.MessageSender): boolean => {
  if (!sender.url) return false;
  try {
    const url = new URL(sender.url);
    return url.origin === GAME_ORIGIN && url.pathname.startsWith(GAME_PATH_PREFIX);
  } catch {
    return false;
  }
};

const handle = async (message: LiveMessage, sender: chrome.runtime.MessageSender): Promise<LiveIntegrationState | undefined> => {
  const stored = await liveStore.load();
  let state = stored.state;
  const isContent = ['content-status', 'snapshot-update', 'adapter-error', 'selector-diagnostics'].includes(message.type);
  if (isContent && (message.origin !== 'content-script' || !contentSenderIsExpected(sender) || !state.enabled)) return undefined;
  if (isContent) gameTabId = sender.tab?.id;
  if (!isContent && message.origin !== 'side-panel') return undefined;
  if (Date.parse(message.timestamp) < Date.parse(state.updatedAt) - 5_000) return state;

  if (message.type === 'state-request') return state;
  if (message.type === 'integration-set') {
    state = { ...state, enabled: message.payload.enabled, status: message.payload.enabled ? 'waiting-for-game-tab' : 'disabled', updatedAt: message.timestamp };
  } else if (message.type === 'data-clear-request') {
    state = await liveStore.clearRealData(state.enabled);
  } else if (message.type === 'snapshot-refresh-request') {
    if (gameTabId !== undefined) await chrome.tabs.sendMessage(gameTabId, message).catch(() => undefined);
    return state;
  } else if (message.type === 'content-status') {
    state = { ...state, status: message.payload.status, updatedAt: message.timestamp };
  } else if (message.type === 'adapter-error') {
    state = { ...state, status: message.payload.code === 'adapter-unavailable' ? 'dom-structure-unsupported' : 'error', error: message.payload.message, updatedAt: message.timestamp };
  } else if (message.type === 'selector-diagnostics') {
    state = { ...state, diagnostics: message.payload.diagnostics, updatedAt: message.timestamp };
  } else if (message.type === 'snapshot-update') {
    const snapshot = message.payload.snapshot;
    if (snapshot.origin !== 'real-dom' || messageSize(snapshot) > MAX_MESSAGE_BYTES) return state;
    if (state.lastSnapshot && Date.parse(snapshot.timestamp) <= Date.parse(state.lastSnapshot.timestamp)) return state;
    state = {
      ...state,
      status: snapshot.missingFields.length ? 'partial-snapshot' : 'snapshot-available',
      updatedAt: message.timestamp,
      lastSnapshot: snapshot,
      diagnostics: snapshot.diagnostics,
      error: undefined
    };
  }
  await liveStore.saveState(state);
  await notifyPanels(state);
  return state;
};

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isLiveMessage(message)) return false;
  void handle(message, sender).then((state) => sendResponse(state)).catch(() => sendResponse(undefined));
  return true;
});
