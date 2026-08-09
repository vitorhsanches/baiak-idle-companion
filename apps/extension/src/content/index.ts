import { createAutoSellController } from '../actions/autoSell/controller';
import { ACTION_SETTINGS_KEY, loadActionSettings, normalizeActionSettings } from '../storage/settings';
console.info('[BIC] content script started');
let controller: ReturnType<typeof createAutoSellController> | null = null; let disposed = false;
void loadActionSettings().then((settings) => {
  if (disposed) return;
  if (controller) controller.update(settings.autoSell); else controller = createAutoSellController(settings.autoSell);
});
const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
  if (area !== 'local' || !changes[ACTION_SETTINGS_KEY]) return;
  const settings = normalizeActionSettings(changes[ACTION_SETTINGS_KEY].newValue);
  if (controller) controller.update(settings.autoSell); else if (!disposed) controller = createAutoSellController(settings.autoSell);
};
chrome.storage.onChanged.addListener(onChanged);
window.addEventListener('pagehide', () => { disposed = true; controller?.stop(); controller = null; chrome.storage.onChanged.removeListener(onChanged); }, { once: true });
