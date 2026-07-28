/* global process */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const outputDirectory = resolve('dist/extension');
const fail = (message) => { throw new Error(`Build verification failed: ${message}`); };
const read = (file) => readFileSync(file, 'utf8');
const listFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = resolve(directory, entry.name);
  return entry.isDirectory() ? listFiles(path) : [path];
});
if (!existsSync(outputDirectory)) fail('dist/extension is missing');
const manifestPath = resolve(outputDirectory, 'manifest.json');
if (!existsSync(manifestPath)) fail('manifest.json is missing');
const manifest = JSON.parse(read(manifestPath));
if (manifest.manifest_version !== 3) fail('manifest is not V3');
if (JSON.stringify(manifest.permissions) !== JSON.stringify(['sidePanel', 'storage'])) fail('permissions are not minimal');
for (const forbidden of ['host_permissions', 'cookies', 'tabs', 'scripting', 'webRequest', '<all_urls>']) if (JSON.stringify(manifest).includes(forbidden)) fail(`forbidden manifest capability: ${forbidden}`);
if (manifest.content_scripts?.length !== 1) fail('exactly one content script is required');
const contentScript = manifest.content_scripts[0];
if (JSON.stringify(contentScript.matches) !== JSON.stringify(['https://baiakidle.com/jogar/*'])) fail('content script route is not minimal');
if (contentScript.run_at !== 'document_idle' || 'world' in contentScript) fail('content script must use the default isolated world at document_idle');
for (const entry of [manifest.background?.service_worker, manifest.side_panel?.default_path, ...contentScript.js]) if (typeof entry !== 'string' || !existsSync(resolve(outputDirectory, entry))) fail(`missing manifest entry: ${entry}`);
const files = listFiles(outputDirectory);
for (const file of files) {
  const name = relative(outputDirectory, file);
  if (name.endsWith('.map')) fail(`source map emitted: ${name}`);
  if (/\.(?:js|html)$/i.test(name)) {
    const content = read(file);
    for (const forbidden of ['document.cookie', 'localStorage', 'sessionStorage', 'XMLHttpRequest', 'WebSocket', 'chrome.cookies', 'chrome.webRequest', 'chrome.debugger', 'world: MAIN', 'eval(', 'new Function']) if (content.includes(forbidden)) fail(`forbidden runtime pattern ${forbidden} in ${name}`);
    if (/\b(?:importScripts|import)\s*\(\s*['"]https?:\/\//.test(content)) fail(`remote script import in ${name}`);
    if (/<(?:script|link)\b[^>]+(?:src|href)=['"]https?:\/\//i.test(content)) fail(`remote HTML asset in ${name}`);
  }
}
for (const directory of ['apps/extension/src', 'packages/game-adapter/src']) for (const file of listFiles(resolve(directory))) {
  if (!/\.(?:ts|tsx)$/.test(file) || /\.test\.(?:ts|tsx)$/.test(file)) continue;
  const content = read(file);
  for (const forbidden of ['document.cookie', 'localStorage', 'sessionStorage', 'XMLHttpRequest', 'WebSocket', 'chrome.cookies', 'chrome.webRequest', 'chrome.debugger', 'world: MAIN', 'eval(', 'new Function']) if (content.includes(forbidden)) fail(`forbidden source pattern ${forbidden} in ${relative('.', file)}`);
}
process.stdout.write(`Build verified: ${files.length} files, Manifest V3, local-only runtime.\n`);
