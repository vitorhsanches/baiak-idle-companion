import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@companion/domain': resolve(__dirname, 'packages/domain/src/index.ts'),
      '@companion/game-adapter': resolve(__dirname, 'packages/game-adapter/src/index.ts'),
      '@companion/optimizer-core': resolve(__dirname, 'packages/optimizer-core/src/index.ts'),
      '@companion/shared': resolve(__dirname, 'packages/shared/src/index.ts')
    }
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./apps/extension/src/test/setup.ts'] }
});
