import path from 'node:path'
import { defineConfig } from 'vitest/config'

const root = import.meta.dirname

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 20_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
      'server-only': path.resolve(root, './test/server-only.ts'),
    },
  },
})
