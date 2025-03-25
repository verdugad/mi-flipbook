const CACHE_NAME = 'flipbook-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/flipbook.css',
    '/js/jquery.min.js',
    '/js/pdf.min.js',
    '/js/pdf.worker.min.js',
    '/js/turn.min.js',
    '/js/flipbook.js',
    '/pdf/revista.pdf',
    '/manifest.json',
    '/images/icon-192.png',
    '/images/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            if (response) {
                return response;
            }
            return fetch(event.request);
        })
    );
});