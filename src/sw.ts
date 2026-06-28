/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
// Take control of all open pages immediately on activation — without this,
// a new SW only handles fetches from pages opened AFTER it activates, so the
// currently-open tab keeps showing the old precached HTML/JS.
clientsClaim()
cleanupOutdatedCaches()

// Injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST)

// SPA navigation fallback.
const navigationHandler = createHandlerBoundToURL('/index.html')
const navRoute = new NavigationRoute(navigationHandler, {
  denylist: [/^\/api\//],
})
registerRoute(navRoute)

// OSM tiles — cache aggressively so map works offline once visited.
registerRoute(
  ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
)

// Nominatim geocoding — short-lived cache, network-first.
registerRoute(
  ({ url }) => url.hostname === 'nominatim.openstreetmap.org',
  new NetworkFirst({
    cacheName: 'nominatim',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
)

// Overpass POI proxy — let stale data show offline rather than blank.
registerRoute(
  ({ url }) => url.pathname.endsWith('/api/overpass'),
  new NetworkFirst({
    cacheName: 'overpass',
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
)
