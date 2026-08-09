import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import manifest from './manifest.json';

export default defineConfig({
  root: __dirname,
  plugins: [
    react(),
    {
      name: 'emit-extension-manifest',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'manifest.json', source: JSON.stringify(manifest, null, 2) });
      }
    }
  ],
  build: {
    modulePreload: { polyfill: false },
    outDir: resolve(__dirname, '../../dist/extension'),
    emptyOutDir: true,
    rollupOptions: {
      input: { sidepanel: resolve(__dirname, 'index.html') }
    }
  }
});
