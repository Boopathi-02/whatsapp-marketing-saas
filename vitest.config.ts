import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    maxConcurrency: 1,
    projects: ['apps/api/vitest.config.ts', 'apps/web/vitest.config.ts'],
  },
});
