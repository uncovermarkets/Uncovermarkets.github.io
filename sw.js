const CACHE_NAME = 'uncovermarkets-v8'; // Version with fixed auth and flash messages

const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    // Quill Rich Text Editor CSS and JS
    'https://cdn.quilljs.com/1.3.6/quill.snow.css',
    'https://cdn.quilljs.com/1.3.6/quill.js',
    // Firebase
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Cache local files (required)
                cache.addAll([
                    '/',
                    '/index.html',
                    '/manifest.json'
                ]);

                // Cache external CDN files (optional - won't block install)
                cache.addAll([
                    'https://cdn.quilljs.com/1.3.6/quill.snow.css',
                    'https://cdn.quilljs.com/1.3.6/quill.js',
                    'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js',
                    'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js',
                    'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js',
                    'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js'
                ]).catch(() => {
                    console.log('CDN files may not be available offline, but app will work with online CDN');
                });
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For Firebase and external APIs, use network-first strategy
    if (event.request.url.includes('firebaseapp.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('firebasestorage.app')) {
        
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Don't cache invalid responses
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    if (response.type === 'basic' || response.type === 'cors') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(() => {
                                // Silently fail if cache write fails
                            });
                    }

                    return response;
                })
                .catch(() => {
                    // Return cached response if offline
                    return caches.match(event.request);
                })
        );
    } else {
        // For static assets, use cache-first strategy
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Return cached response if available
                    if (response) {
                        return response;
                    }

                    return fetch(event.request)
                        .then(response => {
                            // Don't cache invalid responses
                            if (!response || response.status !== 200 || response.type === 'error') {
                                return response;
                            }

                            if (response.type === 'basic' || response.type === 'cors') {
                                const responseToCache = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(event.request, responseToCache);
                                    })
                                    .catch(() => {
                                        // Silently fail if cache write fails
                                    });
                            }

                            return response;
                        })
                        .catch(() => {
                            // Return cached page if offline
                            return caches.match('/index.html');
                        });
                })
        );
    }
});
