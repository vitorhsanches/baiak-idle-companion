import { DomGameAdapter, gameDomSelectors } from '@companion/game-adapter';
import {
  createMessage, GAME_ORIGIN, isGamePath, MAX_MESSAGE_BYTES, messageSize,
  type LiveSnapshot, type SelectorDiagnostic
} from '../integration/protocol';

const SETTINGS_KEY = 'companion.settings';
const MIN_READ_INTERVAL_MS = 2_000;
let enabled = false;
let observer: MutationObserver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastReadAt = 0;
let lastChecksum = '';

const send = async (message: ReturnType<typeof createMessage>): Promise<void> => {
  if (messageSize(message) <= MAX_MESSAGE_BYTES) await chrome.runtime.sendMessage(message);
};

const diagnostics = (): SelectorDiagnostic[] =>
  Object.entries(gameDomSelectors)
    .filter(([logicalName]) => logicalName !== 'version')
    .map(([logicalName, selector]) => {
      const nodes = document.querySelectorAll(String(selector));
      const node = nodes[0];
      return {
        logicalName,
        selectorVersion: gameDomSelectors.version,
        matchedCount: nodes.length,
        reason: nodes.length ? undefined : 'visible-semantic-element-not-found',
        tag: node?.tagName.toLowerCase(),
        semanticAttributes: node
          ? ['aria-label', 'data-name', 'data-level', 'data-lv', 'data-slot'].filter((name) => node.hasAttribute(name))
          : []
      };
    });

const checksum = (value: unknown): string => {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16);
};

const read = async (): Promise<void> => {
  timer = undefined;
  if (!enabled || location.origin !== GAME_ORIGIN || !isGamePath(location.pathname)) return;
  const elapsed = Date.now() - lastReadAt;
  if (elapsed < MIN_READ_INTERVAL_MS) {
    timer = setTimeout(() => void read(), MIN_READ_INTERVAL_MS - elapsed);
    return;
  }
  lastReadAt = Date.now();
  await send(createMessage('content-status', 'content-script', { status: 'reading-visible-dom' }));
  try {
    const result = await new DomGameAdapter(document).readCharacter();
    const selectorDiagnostics = diagnostics();
    if (!result.value) {
      await send(createMessage('adapter-error', 'content-script', { code: 'adapter-unavailable', message: result.errors[0]?.slice(0, 500) ?? 'DOM structure unsupported' }));
      return;
    }
    const stable = { character: result.value, diagnostics: selectorDiagnostics, pagePath: location.pathname };
    const nextChecksum = checksum(stable);
    if (nextChecksum === lastChecksum) return;
    lastChecksum = nextChecksum;
    const snapshot: LiveSnapshot = {
      id: `dom-${Date.now()}-${nextChecksum}`,
      schemaVersion: 1,
      selectorVersion: gameDomSelectors.version,
      timestamp: result.readAt,
      origin: 'real-dom',
      pagePath: location.pathname,
      confidence: result.confidence,
      missingFields: result.value.unavailableFields,
      warnings: result.errors,
      character: result.value,
      diagnostics: selectorDiagnostics
    };
    const message = createMessage('snapshot-update', 'content-script', { snapshot });
    if (messageSize(message) > MAX_MESSAGE_BYTES) {
      await send(createMessage('adapter-error', 'content-script', { code: 'snapshot-too-large', message: 'Sanitized snapshot exceeded the local size limit.' }));
      return;
    }
    await send(message);
  } catch (reason) {
    await send(createMessage('adapter-error', 'content-script', { code: 'adapter-error', message: reason instanceof Error ? reason.message.slice(0, 500) : 'DOM adapter error' }));
  }
};

const schedule = (): void => {
  if (!enabled || timer) return;
  timer = setTimeout(() => void read(), Math.max(0, MIN_READ_INTERVAL_MS - (Date.now() - lastReadAt)));
};
const stop = (): void => {
  observer?.disconnect();
  observer = undefined;
  if (timer) clearTimeout(timer);
  timer = undefined;
  lastChecksum = '';
};
const start = (): void => {
  stop();
  if (!isGamePath(location.pathname)) return;
  void send(createMessage('content-status', 'content-script', { status: 'game-page-detected' }));
  observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  schedule();
};
const applyEnabled = (value: boolean): void => {
  enabled = value;
  if (enabled) start();
  else {
    stop();
    void send(createMessage('content-status', 'content-script', { status: 'disabled' }));
  }
};

void chrome.storage.local.get(SETTINGS_KEY).then((stored) => {
  const value = stored[SETTINGS_KEY] as { liveDomEnabled?: unknown } | undefined;
  applyEnabled(value?.liveDomEnabled === true);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[SETTINGS_KEY]) return;
  const value = changes[SETTINGS_KEY].newValue as { liveDomEnabled?: unknown } | undefined;
  applyEnabled(value?.liveDomEnabled === true);
});
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (message && typeof message === 'object' && (message as { type?: unknown }).type === 'snapshot-refresh-request' && enabled) {
    lastChecksum = '';
    schedule();
  }
});
