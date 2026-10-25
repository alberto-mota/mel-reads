const V = 'melreads-v8';
const SHELL = ['./', 'index.html', 'content.js', 'sparkle.js', 'audio.js', 'sync.js', 'app.js', 'testkit.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// app files: network-first (updates show up right away), cached copy when offline.
// other sites (voice clips, cloud save, fonts) are left to the browser.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (!r.ok) return r; const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)).catch(() => {}); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
