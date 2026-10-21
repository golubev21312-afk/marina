/*
 * Работа без сети: сайт открывается и показывает последний сохранённый каталог.
 * Подключается в собранном сайте (src/lib/offline.js), при разработке — нет.
 *
 *   страницы — сначала сеть; нет сети — сохранённая (любая: сайт один и тот же)
 *   код (/assets — имена с хешем, не меняются) — из сохранённого, если есть
 *   шрифты, картинки сайта, 3D-модели — сохранённое сразу, а в фоне обновляем
 *   данные каталога (/api/collections/…/records) — сначала сеть, без сети — сохранённые
 *   фото из базы (/api/files/…) — из сохранённого, если есть; не больше MAX_FILES
 * Не трогаем: админку, обновления «на лету» (realtime), запросы со входом, не-GET.
 * Поменяли правила — поднять VERSION: старые сохранения сотрутся.
 */
const VERSION = 'v1';
const PAGES = `craft-pages-${VERSION}`;
const STATIC = `craft-static-${VERSION}`;
const DATA = `craft-data-${VERSION}`;
const FILES = `craft-files-${VERSION}`;
const MAX_FILES = 300;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  const keep = [PAGES, STATIC, DATA, FILES];
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => !keep.includes(name)).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

/** Сначала сеть; удалось — сохраняем; нет сети — сохранённое. */
async function networkFirst(request, cacheName, fallbackKey) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      if (fallbackKey) cache.put(fallbackKey, response.clone());
    }
    return response;
  } catch (error) {
    const saved = (await cache.match(request)) || (fallbackKey && (await cache.match(fallbackKey)));
    if (saved) return saved;
    throw error;
  }
}

/** Из сохранённого, если есть; нет — из сети и сохраняем. */
async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (limit) {
      const keys = await cache.keys();
      // Самые старые — первыми в списке
      await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)));
    }
  }
  return response;
}

/** Сохранённое — сразу, а из сети — тихо обновляем на следующий раз. */
async function staleWhileRevalidate(event, cacheName) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(event.request);
  const fresh = fetch(event.request).then((response) => {
    if (response.ok) cache.put(event.request, response.clone());
    return response;
  });
  if (saved) {
    event.waitUntil(fresh.catch(() => {}));
    return saved;
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.headers.has('Authorization')) return;
  if (url.pathname.startsWith('/_/') || url.pathname.startsWith('/admin') || url.pathname === '/api/realtime') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGES, '/__shell'));
  } else if (/^\/api\/collections\/[^/]+\/records/.test(url.pathname)) {
    event.respondWith(networkFirst(request, DATA));
  } else if (url.pathname.startsWith('/api/files/')) {
    event.respondWith(cacheFirst(request, FILES, MAX_FILES));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, STATIC));
  } else if (/^\/(fonts|img|icons|textures)\/|\.glb$|^\/(theme-init\.js|manifest\.webmanifest)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, STATIC));
  }
});
