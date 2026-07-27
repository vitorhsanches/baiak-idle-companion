import { defaultSettings, settingsStore } from './settings';
describe('settings storage', () => {
  beforeEach(() => localStorage.clear());
  it('persists and loads preferences', async () => {
    await settingsStore.save({ ...defaultSettings, theme: 'light' });
    expect((await settingsStore.load()).theme).toBe('light');
  });
  it('restores defaults', async () => expect(await settingsStore.reset()).toEqual(defaultSettings));
  it('falls back safely for corrupt, partial, invalid, and future-shaped data', async () => {
    localStorage.setItem('companion.settings', '{not-json');
    expect(await settingsStore.load()).toEqual(defaultSettings);
    localStorage.setItem('companion.settings', JSON.stringify({ theme: 'light' }));
    expect(await settingsStore.load()).toEqual({ ...defaultSettings, theme: 'light' });
    localStorage.setItem('companion.settings', JSON.stringify({ version: 2, theme: 'neon' }));
    expect(await settingsStore.load()).toEqual(defaultSettings);
  });
  it('removes only demo data', async () => {
    localStorage.setItem('companion.demo', 'mock');
    localStorage.setItem('companion.settings', JSON.stringify(defaultSettings));
    await settingsStore.clearDemoData();
    expect(localStorage.getItem('companion.demo')).toBeNull();
    expect(await settingsStore.load()).toEqual(defaultSettings);
  });
});
