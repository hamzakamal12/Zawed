import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Stamps a per-build id into the service worker.
 *
 * Files in `public/` are copied verbatim, so sw.js used to ship byte-identical
 * every release. A byte-identical worker is never reinstalled, so its cached
 * app shell stayed frozen at whatever the user's first visit fetched — and
 * because the cache name was a constant, `activate` never cleared it either.
 * Hashing index.html ties the id to the built asset names, so it changes
 * exactly when the app does and stays stable when it doesn't.
 */
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist')
      const swPath = path.join(dist, 'sw.js')
      const id = createHash('sha256')
        .update(readFileSync(path.join(dist, 'index.html')))
        .digest('hex')
        .slice(0, 12)
      const sw = readFileSync(swPath, 'utf8')
      if (!sw.includes('__BUILD_ID__')) {
        throw new Error('sw.js has no __BUILD_ID__ placeholder — the cache would never version')
      }
      writeFileSync(swPath, sw.replace('__BUILD_ID__', id))
    },
  }
}

export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2019', // low-end Android browsers
    rollupOptions: {
      output: {
        // Keep the initial payload small on 3G: split the heavy vendors so
        // the shell can paint before everything downloads.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
})
