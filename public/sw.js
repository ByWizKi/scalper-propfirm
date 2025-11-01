const CACHE_NAME = 'scalper-propfirm-v1'
const urlsToCache = [
  '/',
  '/dashboard',
  '/dashboard/accounts',
  '/dashboard/pnl',
  '/dashboard/withdrawals',
  '/dashboard/profile',
  '/icon.svg',
  '/favicon.svg',
]

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Stratégie de cache: Network First avec fallback sur le cache
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return

  // Ignorer les requêtes vers l'API (toujours aller sur le réseau)
  if (event.request.url.includes('/api/')) {
    return event.respondWith(fetch(event.request))
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cloner la réponse car elle ne peut être consommée qu'une seule fois
        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
      .catch(() => {
        // Si le réseau échoue, essayer de récupérer depuis le cache
        return caches.match(event.request)
      })
  )
})

