const V = 'cube-helper-v3';
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'js/app.js', 'js/cube.js', 'js/solver.js', 'js/validate.js', 'js/color.js', 'js/detect.js', 'js/scan.js', 'js/render.js', 'js/text.js'];
// cache: 'reload' so a new version never copies old files out of the browser's HTTP cache
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Network first (revalidated, so app.js and its modules are always the same
  // version); fall back to the cache when offline. Only good answers get cached.
  e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin', redirect: req.mode === 'navigate' ? 'manual' : 'follow' }).then(r => {
    if (r.ok && r.type === 'basic') { const copy = r.clone(); caches.open(V).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined)).then(r => r || Response.error())));
});
