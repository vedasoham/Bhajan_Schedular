// ============================================================
// Service Worker — Bhajan Planner PWA
// Strategy: Network-first for navigation, stale-while-revalidate
// for static assets, cache Google Fonts
// ============================================================

const CACHE_VERSION = 'v2';
const CACHE_NAME    = `bhajan-planner-${CACHE_VERSION}`;

// Assets to pre-cache during the install step.
// This is the "app shell" — everything needed for the offline fallback
// and fast first paint on repeat visits.
const PRECACHE_URLS = [
  '/offline.html',
  '/css/style.css',
  '/css/loading.css',
  '/css/pwa.css',
  '/css/notifications.css',
  '/css/bulletin.css',
  '/js/script.js',
  '/js/loading.js',
  '/js/pwa.js',
  '/js/notifications.js',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
];

// ── Install: pre-cache the app shell ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete outdated caches ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('bhajan-planner-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: smart caching strategies ───────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (form submissions, API writes, etc.)
  if (request.method !== 'GET') return;

  // ─ Google Fonts: cache-first (they rarely change) ─
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
      )
    );
    return;
  }

  // Only handle same-origin from here on
  if (url.origin !== location.origin) return;

  // ─ Navigation requests: network-first, offline fallback ─
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // ─ Static assets: stale-while-revalidate ─
  // Serve from cache immediately, then update the cache in the background
  if (
    request.destination === 'style'  ||
    request.destination === 'script' ||
    request.destination === 'image'  ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);

          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // ─ Everything else: network-first ─
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Push notifications ────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Bhajan Planner', body: 'You have a new notification', url: '/' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.warn('[SW] Push data parse error:', e);
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/images/icons/icon-192x192.png',
    badge: data.badge || '/images/icons/icon-192x192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag: data.tag || 'bhajan-planner-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Bhajan Planner', options)
  );
});

// ── Notification click — navigate to the relevant page ────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return client.navigate(url);
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});
