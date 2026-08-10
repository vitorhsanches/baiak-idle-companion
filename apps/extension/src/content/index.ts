import { createAutoSellController } from '../actions/autoSell/controller';
import { isExtensionContextInvalidated, isExtensionRuntimeUsable } from './runtime';
import { ACTION_SETTINGS_KEY, loadActionSettings, normalizeActionSettings } from '../storage/settings';
console.info('[BIC] content script started');
let controller: ReturnType<typeof createAutoSellController> | null = null; let disposed = false;
let invalidationLogged = false;
const stopForInvalidatedContext = (): void => {
  if (disposed) return;
  disposed = true;
  if (controller) controller.invalidateContext();
  else if (!invalidationLogged) { invalidationLogged = true; console.info('[BIC] extension context invalidated; controller stopped'); }
};
void loadActionSettings().then((settings) => {
  if (disposed) return;
  if (controller) controller.update(settings.autoSell); else controller = createAutoSellController(settings.autoSell);
}).catch((error: unknown) => {
  if (isExtensionContextInvalidated(error)) stopForInvalidatedContext();
  else console.error('[BIC] failed to load action settings', error);
});
const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
  if (!isExtensionRuntimeUsable()) { stopForInvalidatedContext(); return; }
  if (area !== 'local' || !changes[ACTION_SETTINGS_KEY]) return;
  const settings = normalizeActionSettings(changes[ACTION_SETTINGS_KEY].newValue);
  if (controller) controller.update(settings.autoSell); else if (!disposed) controller = createAutoSellController(settings.autoSell);
};
if (isExtensionRuntimeUsable()) chrome.storage.onChanged.addListener(onChanged);
window.addEventListener('pagehide', () => {
  disposed = true; controller?.stop(); controller = null;
  if (isExtensionRuntimeUsable()) chrome.storage.onChanged.removeListener(onChanged);
}, { once: true });
