import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Standalone vitest config (kept separate from vite.config so the dev-only /api
// plugin never loads under test). Pure domain logic → fast Node environment.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
