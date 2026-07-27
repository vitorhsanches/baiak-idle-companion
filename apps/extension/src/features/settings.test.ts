import { defaultSettings, settingsStore } from './settings';
describe('settings storage', () => {
  beforeEach(() => localStorage.clear());
  it('persists and loads preferences', async () => {
    await settingsStore.save({ ...defaultSettings, theme: 'light' });
    expect((await settingsStore.load()).theme).toBe('light');
  });
  it('restores defaults', async () => expect(await settingsStore.reset()).toEqual(defaultSettings));
});
