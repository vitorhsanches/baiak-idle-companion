export type Theme = 'dark' | 'light' | 'system';
export interface Settings {
  showCompatibility: boolean;
  showCombatBreakdown: boolean;
  notifications: boolean;
  liveDomEnabled: boolean;
  theme: Theme;
}
interface StoredSettings extends Settings {
  version: 1;
}
export const defaultSettings: Settings = {
  showCompatibility: true, showCombatBreakdown: true, notifications: false, liveDomEnabled: false, theme: 'dark'
};
const key = 'companion.settings';
let memoryFallback: StoredSettings | undefined;
const isTheme = (value: unknown): value is Theme =>
  value === 'dark' || value === 'light' || value === 'system';
const sanitizeSettings = (value: unknown): Settings => {
  if (!value || typeof value !== 'object') return defaultSettings;
  const candidate = value as Partial<StoredSettings>;
  return {
    showCompatibility: typeof candidate.showCompatibility === 'boolean' ? candidate.showCompatibility : defaultSettings.showCompatibility,
    showCombatBreakdown: typeof candidate.showCombatBreakdown === 'boolean' ? candidate.showCombatBreakdown : defaultSettings.showCombatBreakdown,
    notifications: typeof candidate.notifications === 'boolean' ? candidate.notifications : defaultSettings.notifications,
    liveDomEnabled: candidate.liveDomEnabled === true,
    theme: isTheme(candidate.theme) ? candidate.theme : defaultSettings.theme
  };
};
const deserializeSettings = (value: unknown): Settings => {
  if (typeof value !== 'string') return sanitizeSettings(value);
  try { return sanitizeSettings(JSON.parse(value) as unknown); } catch { return defaultSettings; }
};
const serializeSettings = (settings: Settings): StoredSettings => ({ version: 1, ...sanitizeSettings(settings) });
export const settingsStore = {
  async load(): Promise<Settings> {
    if (globalThis.chrome?.storage?.local) {
      const result = await chrome.storage.local.get(key);
      return deserializeSettings(result[key]);
    }
    return deserializeSettings(memoryFallback);
  },
  async save(settings: Settings): Promise<void> {
    const serialized = serializeSettings(settings);
    if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ [key]: serialized });
    else memoryFallback = serialized;
  },
  async reset(): Promise<Settings> {
    await this.save(defaultSettings);
    return defaultSettings;
  },
  async clearDemoData(): Promise<void> {
    if (globalThis.chrome?.storage?.local) await chrome.storage.local.remove('companion.demo');
  }
};
