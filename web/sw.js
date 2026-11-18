const CACHE = 'loteria-v20';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/pool-print.css',
  './js/app.js',
  './js/sw-register.js',
  './js/theme-init.js',
  './js/config.js',
  './js/api.js',
  './js/storage.js',
  './js/ui.js',
  './js/results.js',
  './js/stats.js',
  './js/simulator.js',
  './js/favorites.js',
  './js/pool.js',
  './js/draws.js',
  './js/auth.js',
  './js/account.js',
  './js/auth-config.js',
  './js/cloud.js',
  './js/vendor/supabase.js',
  './favicon.svg',
  './fonts/inter-latin-var.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.webmanifest',
  './data/history-megasena.json',
  './data/history-lotofacil.json',
  './data/history-quina.json',
  './data/history-lotomania.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Rede primeiro; o cache só é usado sem conexão. Assim um deploy novo chega
// a todos sem depender de trocar a versão do cache.
function networkFirst(request, cacheKey = request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(cacheKey, clone));
      }
      return response;
    })
    .catch(() => caches.match(cacheKey).then((cached) => cached || Response.error()));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Resultados da Caixa: guardados para consulta offline.
  if (url.hostname.endsWith('caixa.gov.br')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Supabase, Turnstile e outros serviços externos nunca passam pelo cache
  // (dados de conta não podem ficar guardados no aparelho).
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  event.respondWith(networkFirst(request));
});
