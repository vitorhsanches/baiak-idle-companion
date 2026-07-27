export type Theme = 'dark' | 'light' | 'system';
export interface Settings {
  showCompatibility: boolean;
  showCombatBreakdown: boolean;
  notifications: boolean;
  theme: Theme;
}
export const defaultSettings: Settings = {
  showCompatibility: true, showCombatBreakdown: true, notifications: false, theme: 'dark'
};
const key = 'companion.settings';
export const settingsStore = {
  async load(): Promise<Settings> {
    if (globalThis.chrome?.storage?.local) {
      const result = await chrome.storage.local.get(key);
      return { ...defaultSettings, ...(result[key] as Partial<Settings> | undefined) };
    }
    const value = localStorage.getItem(key);
    return value ? { ...defaultSettings, ...(JSON.parse(value) as Partial<Settings>) } : defaultSettings;
  },
  async save(settings: Settings): Promise<void> {
    if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ [key]: settings });
    else localStorage.setItem(key, JSON.stringify(settings));
  },
  async reset(): Promise<Settings> {
    await this.save(defaultSettings);
    return defaultSettings;
  },
  async clearDemoData(): Promise<void> {
    if (globalThis.chrome?.storage?.local) await chrome.storage.local.remove('companion.demo');
    else localStorage.removeItem('companion.demo');
  }
};
