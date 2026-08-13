/**
 * Offline shell for Zawed Supply.
 *
 * Connectivity here is intermittent, so the app shell and its static assets
 * are cached and served from disk when the network is unreachable. API calls
 * are never cached — prices depend on a live FX rate, and stale ones would be
 * worse than no answer. TanStack Query's persisted cache covers offline reads.
 */
const CACHE = 'zawed-shell-v1'
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

  // Navigations fall back to the cached shell so the app opens offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r ?? Response.error())),
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
