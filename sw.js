/* =====================================================================
   IPA Cards — Service Worker
   · index.html 用 network-first：每次打开都拉最新版（改完只传
     index.html 即可立即生效，不用再改版本号）
   · 静态资源 cache-first：加载快、离线可用
   · API 请求 network-first：不缓存过期词典数据
   ===================================================================== */

const CACHE_NAME = 'ipa-cards-v3';

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

// ---- Fetch ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // 1) API calls (Wordnik / Wiktionary / dictionaryapi / Google Translate / MyMemory):
  //    network-first, never stale
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
    return;
  }

  // 2) Page navigation (index.html): network-first, fall back to cached copy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3) Other static assets: cache-first, fall back to network
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
