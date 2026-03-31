import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    isolate: true,
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
    alias: {
      '@arivarangam/config': resolve(__dirname, '../../packages/config/src/index.ts'),
      '@arivarangam/types':  resolve(__dirname, '../../packages/types/src/index.ts'),
      '@arivarangam/db':     resolve(__dirname, '../../packages/db/src/index.ts'),
    },
  },
})
