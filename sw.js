/* ============================================================================
   UNCOVER MARKETS PWA - SERVICE WORKER (v8 - WITH UI IMPROVEMENTS)
   Updated: 2025-11-05
   
   Features:
   - Photo upload support with flash messages
   - Quill Rich Text Editor CDN caching
   - Newsletter management
   - Firebase integration compatible
   - Smart offline fallback
   - UI improvements (navbar, banner)
   
   ============================================================================ */

const CACHE_NAME = 'uncovermarkets-v8-ui-updated';

const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    
    // Quill Rich Text Editor - for newsletter editing
    'https://cdn.quilljs.com/1.3.6/quill.snow.css',
    'https://cdn.quilljs.com/1.3.6/quill.js',
    
    // Core CSS and JS
    '/styles.css',
    '/app.js'
];

// ============================================================================
// INSTALL EVENT - Cache essential files
// ============================================================================

self.addEventListener('install', event => {
    console.log('🔧 Service Worker installing v8...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching local files...');
                
                // Cache local files (REQUIRED - must succeed)
                return cache.addAll([
                    '/',
                    '/index.html',
                    '/manifest.json'
                ])
                .then(() => {
                    // Cache external CDN files (OPTIONAL - won't block install)
                    console.log('📦 Caching CDN files...');
                    return cache.addAll([
                        'https://cdn.quilljs.com/1.3.6/quill.snow.css',
                        'https://cdn.quilljs.com/1.3.6/quill.js'
                    ])
                    .catch(() => {
                        console.log('⚠️  CDN files may not be available offline, but app will work with online CDN');
                    });
                });
            })
            .then(() => {
                console.log('✓ Cache installation complete');
                return self.skipWaiting();
            })
    );
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================

self.addEventListener('activate', event => {
    console.log('🚀 Service Worker activating v8...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️  Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('✓ Old caches cleaned');
            return self.clients.claim();
        })
    );
});

// ============================================================================
// FETCH EVENT - Network-first strategy with cache fallback
// ============================================================================

self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Skip non-GET requests (POST, PUT, DELETE, etc.)
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip non-http(s) requests
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Use cache-first for same-origin requests (faster)
    // Use network-first for cross-origin (CDN, APIs)
    if (request.url.startsWith(self.location.origin)) {
        event.respondWith(cacheFirst(request));
    } else {
        event.respondWith(networkFirst(request));
    }
});

// ============================================================================
// CACHE-FIRST STRATEGY - Use cache, fallback to network
// Best for: Static assets (CSS, JS, HTML)
// ============================================================================

async function cacheFirst(request) {
    try {
        // Try cache first
        const cached = await caches.match(request);
        if (cached) {
            console.log('📦 From cache:', request.url);
            return cached;
        }
        
        // If not in cache, fetch from network
        const response = await fetch(request);
        
        // Cache successful responses
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        
        // Return cached page if offline
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) {
            return cachedIndex;
        }
        
        // Return error response
        return new Response('Network error - offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// ============================================================================
// NETWORK-FIRST STRATEGY - Try network, fallback to cache
// Best for: API calls, CDN resources, dynamic content
// ============================================================================

async function networkFirst(request) {
    try {
        // Try network first
        const response = await fetch(request);
        
        // Cache successful responses
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.warn('Network unavailable, trying cache:', request.url);
        
        // Fall back to cache
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        
        // Return error response
        return new Response('Network error - no cache available', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// ============================================================================
// MESSAGE HANDLER - Communication with client
// ============================================================================

self.addEventListener('message', event => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            console.log('⏭️  Skipping waiting period');
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            console.log('🗑️  Clearing all caches');
            clearAllCaches();
            break;
            
        case 'CACHE_URLS':
            console.log('📦 Caching specific URLs');
            cacheSpecificUrls(payload);
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(name => {
            console.log('Deleting cache:', name);
            return caches.delete(name);
        })
    );
}

async function cacheSpecificUrls(urls) {
    const cache = await caches.open(CACHE_NAME);
    return Promise.all(
        urls.map(url => {
            return fetch(url)
                .then(response => {
                    if (response.ok) {
                        cache.put(url, response);
                        console.log('✓ Cached:', url);
                    }
                })
                .catch(error => console.warn('Failed to cache', url, error));
        })
    );
}

// ============================================================================
// BACKGROUND SYNC - Sync data when connection restored
// ============================================================================

self.addEventListener('sync', event => {
    console.log('🔄 Background sync event:', event.tag);
    
    if (event.tag === 'sync-newsletter') {
        event.waitUntil(syncNewsletter());
    }
    
    if (event.tag === 'sync-photos') {
        event.waitUntil(syncPhotos());
    }
});

async function syncNewsletter() {
    try {
        // Sync newsletter data with backend
        const response = await fetch('/api/newsletters/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✓ Newsletter synced');
        return response.json();
    } catch (error) {
        console.error('Newsletter sync failed:', error);
        throw error;
    }
}

async function syncPhotos() {
    try {
        // Sync photos with Firebase/backend
        const response = await fetch('/api/photos/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✓ Photos synced');
        return response.json();
    } catch (error) {
        console.error('Photos sync failed:', error);
        throw error;
    }
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'New notification from Uncover Markets',
        icon: '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        vibrate: [100, 50, 100],
        tag: 'notification',
        requireInteraction: false,
        data: data
    };
    
    event.waitUntil(
        self.registration.showNotification('Uncover Markets', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // Check if app window is already open
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window if not open
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// ============================================================================
// SERVICE WORKER LOGGING
// ============================================================================

console.log('✓ Service Worker v8 script loaded');
console.log('  - Caches: photos, newsletters, Quill editor');
console.log('  - Offline: Yes');
console.log('  - Background sync: Yes');
console.log('  - Push notifications: Yes');
console.log('  - UI improvements: Navbar, welcome banner');
