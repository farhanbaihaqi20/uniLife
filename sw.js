// PENTING: Increment versi ini setiap kali ada update code!
const CACHE_VERSION = '1.0.3.1'; // v1.0.1 - Full Release dengan Premium Polish
const CACHE_NAME = `unilife-tracker-v${CACHE_VERSION}`;

// Static assets yang jarang berubah (agresif caching)git
const STATIC_ASSETS = [
    './assets/icon.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Dynamic assets yang sering update (cache tapi cek update)
const DYNAMIC_ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/storage.js',
    './js/i18n.js',
    './js/home.js',
    './js/schedule.js',
    './js/grades.js',
    './js/tasks.js',
    './js/focus.js',
    './js/profile.js',
    './js/calendarExport.js',
    './js/gradeGoals.js',
    './js/radar.js',
    './js/notes.js',
    './js/inbox.js',
    './js/presensi.js',
    './js/notification.js'
];

const ALL_ASSETS = [...STATIC_ASSETS, ...DYNAMIC_ASSETS];

self.addEventListener('install', (event) => {
    console.log('[SW] Installing new service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets for version:', CACHE_VERSION);
                return cache.addAll(ALL_ASSETS);
            })
            .then(() => self.skipWaiting()) // Force activate immediately
    );
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            // Hapus cache lama
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Service worker activated, taking control');
            return self.clients.claim(); // Take control immediately
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip chrome-extension & non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Strategi: Network First untuk HTML/JS/CSS (selalu cek update)
    // Cache First untuk static assets (gambar, fonts, libraries)
    const isStaticAsset = STATIC_ASSETS.some(asset => event.request.url.includes(asset));
    
    if (isStaticAsset) {
        // Cache First - untuk assets yang jarang berubah
        event.respondWith(
            caches.match(event.request)
                .then((response) => response || fetch(event.request))
        );
    } else {
        // Network First dengan fallback ke cache - untuk code yang sering update
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Update cache dengan response baru
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback ke cache jika offline
                    return caches.match(event.request);
                })
        );
    }
});

// Listener untuk update service worker dari client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
