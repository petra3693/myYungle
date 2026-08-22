import { defineConfig } from 'vitest/config'
import path from 'node:path'

/** Standalone Vitest config — deliberately does not reuse vite.config.ts, which
 * pulls in Figma/dev-server plugins and env loading that unit tests don't need. */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/ios/**', '**/android/**', '**/dist/**'],
  },
})
