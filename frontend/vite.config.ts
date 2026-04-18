/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'test-results/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    pool: 'forks',
    fileParallelism: false,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
