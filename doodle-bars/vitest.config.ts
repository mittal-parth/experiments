import path from 'node:path'
import { defineConfig } from 'vitest/config'

const root = import.meta.dirname

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 20_000,
    // Rivet actor test files share one local engine and pool, so the engine can place one file's room
    // on another file's runner, which has that file's env.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
      'server-only': path.resolve(root, './test/server-only.ts'),
    },
  },
})
