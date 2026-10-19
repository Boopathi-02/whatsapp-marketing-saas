import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@whatsapp-saas/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@whatsapp-saas/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
