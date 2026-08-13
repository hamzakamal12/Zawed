/**
 * Offline shell for Zawed Supply.
 *
 * Connectivity here is intermittent, so the app shell and its static assets
 * are cached and served from disk when the network is unreachable. API calls
 * are never cached — prices depend on a live FX rate, and stale ones would be
 * worse than no answer. TanStack Query's persisted cache covers offline reads.
 *
 * BUILD_ID is stamped in at build time (see vite.config.ts). Two things depend
 * on it:
 *   - the file's bytes change every release, which is what makes the browser
 *     treat this as a NEW worker and run `install` again. A byte-identical
 *     sw.js is never reinstalled, so anything cached at install would other-
 *     wise be frozen at whatever the user's very first visit fetched;
 *   - the cache name changes with it, so `activate` actually deletes the old
 *     cache instead of matching its own name and keeping it forever.
 */
const BUILD_ID = '__BUILD_ID__'
const CACHE = `zawed-shell-${BUILD_ID}`
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Same-origin only: never intercept Supabase or any other API.
  if (url.origin !== self.location.origin) return

  // Navigations are network-first, falling back to the cached shell so the app
  // opens offline. A successful fetch also refreshes that fallback: belt and
  // braces alongside BUILD_ID, so the offline copy still tracks the live site
  // even if a release somehow reuses the worker.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/index.html', copy))
          }
          return response
        })
        .catch(() => caches.match('/index.html').then((r) => r ?? Response.error())),
    )
    return
  }

  // Hashed build assets and fonts: cache-first, they never change in place.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/'))) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached ?? Response.error())
    }),
  )
})
