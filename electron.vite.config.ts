import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: resolve('electron/main.ts'),
          worker: resolve('electron/worker.ts'),
        },
        external: ['better-sqlite3', '@anthropic-ai/sdk'],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve('electron/preload.ts'),
        output: {
          format: 'cjs',
        },
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: resolve('index.html'),
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve('src'),
      },
    },
  },
})
