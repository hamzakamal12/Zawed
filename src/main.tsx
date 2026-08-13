import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

import '@fontsource/cairo/400.css'
import '@fontsource/cairo/600.css'
import '@fontsource/cairo/700.css'
import './index.css'

import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Intermittent connectivity: keep serving cached data, retry quietly.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: true,
      gcTime: 24 * 60 * 60 * 1000, // survive a day offline
      networkMode: 'offlineFirst',
    },
    mutations: { networkMode: 'online' },
  },
})

// Cached catalog/orders survive a reload with no connection.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'zawed.query-cache',
})

// Offline shell. Registered only in production so the dev server keeps
// serving fresh modules.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is an enhancement; the app works without it */
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          // Never persist prices — they must be re-fetched against the live
          // FX rate rather than restored stale from disk.
          shouldDehydrateQuery: (query) => {
            const root = query.queryKey[0]
            return root !== 'catalog-prices' && root !== 'price' && root !== 'fx-current'
          },
        },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
