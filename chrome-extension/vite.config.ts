import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: { port: 5175 },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
  },
})
