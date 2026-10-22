import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Browser-only tooling: runs the renderer against a mock/fallback file layer.
// Useful for screenshot tests and quick UI iteration without Electron.
export default defineConfig({
  root: resolve('src/renderer'),
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer/src')
    }
  },
  plugins: [react()],
  server: { port: 5183, strictPort: true },
  build: { outDir: resolve('out/web'), emptyOutDir: true }
})
