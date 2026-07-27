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
  resolve: {
    alias: {
      '@companion/domain': resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@companion/game-adapter': resolve(__dirname, '../../packages/game-adapter/src/index.ts'),
      '@companion/optimizer-core': resolve(__dirname, '../../packages/optimizer-core/src/index.ts'),
      '@companion/shared': resolve(__dirname, '../../packages/shared/src/index.ts')
    }
  },
  build: {
    outDir: resolve(__dirname, '../../dist/extension'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: { entryFileNames: (chunk) => chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js' }
    }
  }
});
