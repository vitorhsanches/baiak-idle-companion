import manifest from '../../manifest.json';
describe('manifest security', () => {
  it('uses only minimal permissions', () => {
    expect(manifest.permissions).toEqual(['sidePanel', 'storage']);
    expect(manifest).not.toHaveProperty('host_permissions');
    expect(JSON.stringify(manifest)).not.toContain('<all_urls>');
  });
});
