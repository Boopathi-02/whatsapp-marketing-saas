import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    alias: {
      '@whatsapp-saas/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@whatsapp-saas/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@whatsapp-saas/database': path.resolve(__dirname, '../../packages/database/src'),
      '@whatsapp-saas/whatsapp-adapter': path.resolve(__dirname, '../../packages/whatsapp-adapter/src'),
      '@whatsapp-saas/billing': path.resolve(__dirname, '../../packages/billing/src'),
    },
  },
});
