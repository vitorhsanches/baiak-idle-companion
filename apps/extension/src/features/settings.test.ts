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
  it('keeps automatic sale disabled with threshold 30 by default', () => {
    expect(defaultSettings.autoSellEnabled).toBe(false);
    expect(defaultSettings.autoSellThreshold).toBe(30);
    expect(defaultSettings.autoConfirmSale).toBe(false);
  });
  it('persists automatic confirmation settings', async () => {
    await settingsStore.save({ ...defaultSettings, autoSellEnabled: true, autoConfirmSale: true });
    expect(await settingsStore.load()).toMatchObject({ autoSellEnabled: true, autoConfirmSale: true });
  });
  it('persists automatic sale settings', async () => {
    await settingsStore.save({ ...defaultSettings, autoSellEnabled: true, autoSellThreshold: 42 });
    expect(await settingsStore.load()).toMatchObject({ autoSellEnabled: true, autoSellThreshold: 42 });
  });
  it('clears demo data without changing settings', async () => {
    await settingsStore.save(defaultSettings);
    await settingsStore.clearDemoData();
    expect(await settingsStore.load()).toEqual(defaultSettings);
  });
});
