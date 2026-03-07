import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * Build configuration for the renderer engine app.
 * Produces a bundled app (not a library) to be served by the renderer server.
 *
 * Usage: npx vite build --config vite.renderer.config.js
 * Output: renderer-dist/ (copy contents to renderer/public/assets/)
 */
export default defineConfig({
  root: resolve(__dirname, 'engine'),
  envDir: resolve(__dirname, 'engine'),
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'renderer-dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'engine/index.html'),
      output: {
        entryFileNames: 'engine.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'style.css'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
