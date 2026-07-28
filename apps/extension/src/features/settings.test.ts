import { defaultSettings, settingsStore } from './settings';
describe('settings storage', () => {
  it('persists and loads preferences', async () => {
    await settingsStore.save({ ...defaultSettings, theme: 'light' });
    expect((await settingsStore.load()).theme).toBe('light');
  });
  it('restores defaults', async () => expect(await settingsStore.reset()).toEqual(defaultSettings));
  it('keeps live DOM disabled by default', () => {
    expect(defaultSettings.liveDomEnabled).toBe(false);
  });
  it('clears demo data without changing settings', async () => {
    await settingsStore.save(defaultSettings);
    await settingsStore.clearDemoData();
    expect(await settingsStore.load()).toEqual(defaultSettings);
  });
});
