import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: '.test.env' });

export default defineConfig({
  test: {
    name: 'integration',
    include: ['src/__tests__/integration/**/*.test.ts'],
    globalSetup: './src/__tests__/setup/vitest.integration.setup.ts',
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    maxConcurrency: 1,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/__tests__/'],
    },
  },
});
