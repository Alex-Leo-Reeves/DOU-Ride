// ============================================================
// DOU Transit - Service Worker for iOS PWA
// Handles:
//   1. Offline tile caching for OpenStreetMap
//   2. Web Push notifications (iOS via Firebase)
//   3. App shell caching for instant load
// ============================================================

const CACHE_NAME = 'dou-transit-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/flutter_bootstrap.js',
    '/main.dart.js',
    '/icons/Icon-192.png',
    '/icons/Icon-512.png',
    '/icons/ios-120.png',
    '/icons/ios-152.png',
    '/icons/ios-167.png',
    '/icons/ios-180.png',
    '/favicon.png'
];

// Tile cache for OpenStreetMap offline usage
const TILE_CACHE = 'dou-transit-tiles-v1';
const OSM_TILE_PATTERN = /tile\.openstreetmap\.org/;

// ============================================================
// INSTALL: Cache app shell
// ============================================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing DOU Transit service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => {
            console.log('[SW] App shell cached successfully');
            return self.skipWaiting();
        })
    );
});

// ============================================================
// ACTIVATE: Clean old caches
// ============================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                .filter((name) => name !== CACHE_NAME && name !== TILE_CACHE)
                .map((name) => {
                    console.log('[SW] Deleting old cache:', name);
                    return caches.delete(name);
                })
            );
        }).then(() => {
            console.log('[SW] Service worker ready');
            return self.clients.claim();
        })
    );
});

// ============================================================
// FETCH: Cache-first for app shell, network-first for tiles, 
//        network-only for API calls
// ============================================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // OSM tiles: cache-first
    if (OSM_TILE_PATTERN.test(url.hostname)) {
        event.respondWith(
            caches.open(TILE_CACHE).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(() => cachedResponse);
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return;
    }

    // API calls: network-only (never cache sensitive data)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: 'offline' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // App shell and static assets: cache-first
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request).then((response) => {
                // Cache successful responses for static assets
                if (response.status === 200 &&
                    !url.pathname.startsWith('/api/') &&
                    !OSM_TILE_PATTERN.test(url.hostname)) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            });
        })
    );
});

// ============================================================
// PUSH: Handle incoming web push notifications (iOS PWA)
// ============================================================
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'DOU Transit', body: event.data.text() };
        }
    }

    const title = data.title || 'DOU Transit';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/icons/ios-180.png',
        badge: '/icons/ios-120.png',
        tag: data.tag || 'dou-transit-default',
        data: data.data || {},
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ============================================================
// NOTIFICATION CLICK: Handle user tapping a notification
// ============================================================
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification.tag);
    event.notification.close();

    // Extract data from notification
    const notificationData = event.notification.data || {};

    // Determine URL to navigate to based on notification type
    let targetUrl = '/';
    const type = notificationData.type || '';

    switch (type) {
        case 'queue_called':
        case 'boarding_confirmed':
            targetUrl = '/#/student/home';
            break;
        case 'payment_received':
        case 'wallet_deposit':
        case 'wallet_withdrawal':
            targetUrl = '/#/wallet';
            break;
        case 'emergency_alert':
            targetUrl = '/#/emergency';
            break;
        case 'lost_item_ready':
            targetUrl = '/#/lost-items';
            break;
        case 'order_delivery':
        case 'order_delivered':
            targetUrl = '/#/orders';
            break;
        case 'account_suspended':
            targetUrl = '/#/auth/login';
            break;
        default:
            targetUrl = '/';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing tab if available
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// ============================================================
// SYNC: Handle background sync for offline transactions
// ============================================================
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-offline-queue') {
        console.log('[SW] Syncing offline transaction queue...');
        event.waitUntil(syncOfflineQueue());
    }
});

async function syncOfflineQueue() {
    try {
        const response = await fetch('/api/offline/sync', { method: 'POST' });
        if (response.ok) {
            console.log('[SW] Offline queue sync successful');
        }
    } catch (e) {
        console.log('[SW] Offline sync failed (still offline):', e.message);
    }
}

console.log('[SW] DOU Transit service worker loaded');