import manifest from '../../manifest.json';
describe('manifest security', () => {
  it('uses only minimal permissions', () => {
    expect(manifest.permissions).toEqual(['sidePanel', 'storage']);
    expect(manifest).not.toHaveProperty('host_permissions');
    expect(JSON.stringify(manifest)).not.toContain('<all_urls>');
    expect(manifest.permissions).not.toContain('cookies');
    expect(manifest.permissions).not.toContain('tabs');
    expect(manifest.permissions).not.toContain('scripting');
    expect(manifest.permissions).not.toContain('webRequest');
    expect(manifest.permissions).not.toContain('webRequestBlocking');
  });
  it('declares Manifest V3 and local entry points only', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background?.service_worker).toBe('background.js');
    expect(manifest.side_panel?.default_path).toBe('index.html');
    expect(manifest.content_scripts).toEqual([{
      matches: ['https://baiakidle.com/jogar/*'],
      js: ['content.js'],
      run_at: 'document_idle'
    }]);
    expect(JSON.stringify(manifest)).not.toContain('https://*/*');
    expect(JSON.stringify(manifest)).not.toContain('"world"');
    expect(JSON.stringify(manifest)).not.toMatch(/https?:\/\/[^"]+\.js/);
  });
});
