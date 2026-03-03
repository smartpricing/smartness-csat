import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    include: ['src/__tests__/unit/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./src/__tests__/setup/vitest.unit.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/__tests__/'],
    },
  },
});
