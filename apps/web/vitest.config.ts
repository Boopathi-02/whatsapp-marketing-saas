import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    alias: {
      '@whatsapp-saas/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@whatsapp-saas/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
