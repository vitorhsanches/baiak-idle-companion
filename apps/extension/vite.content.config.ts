import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
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
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'BaiakIdleCompanionContent',
      formats: ['iife'],
      fileName: () => 'content.js'
    },
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'content.js'
      }
    }
  }
});
