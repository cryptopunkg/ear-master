// sw.js — Service Worker：预缓存关键资源 + 运行时缓存优先，实现完全离线运行
// 更新资源后请递增 CACHE 版本号（如 vibe-v2）。
const CACHE = 'vibe-v1';

// 安装时预缓存大型/关键资源，保证首次离线也能出声（含 31MB 音色库）
const PRECACHE = [
  './',
  './manifest.webmanifest',
  './spessasynth_processor.min.js',
  './soundfonts/GeneralUser_GS_v1.471.sf2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  // 只处理同源请求
  if (url.origin !== self.location.origin) return;

  // 导航请求：优先网络，失败回退到缓存（保证最新版本）
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./')))
    );
    return;
  }

  // 其它资源：缓存优先，未命中则联网并缓存
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      const resp = await fetch(req);
      if (resp && resp.ok) cache.put(req, resp.clone());
      return resp;
    })
  );
});
