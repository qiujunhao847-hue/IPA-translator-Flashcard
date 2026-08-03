/* =====================================================================
   IPA Cards — Service Worker
   Caches app shell for offline access. API calls go network-first.
   ===================================================================== */

const CACHE_NAME = 'ipa-cards-v2';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// ---- Install: pre-cache app shell ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---- Fetch: cache-first for shell, network-first for API ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // API calls (Wordnik / Wiktionary / dictionaryapi / Google Translate / TTS / MyMemory):
  // network-first, never stale
  if (['api.wordnik.com', 'en.wiktionary.org', 'api.dictionaryapi.dev',
       'translate.googleapis.com', 'api.mymemory.translated.net'].includes(url.hostname)) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ error: '离线状态，请检查网络连接' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
  } else {
    // App shell: cache-first, fallback to network
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
