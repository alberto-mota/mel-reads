const V = 'melreads-v9', VOICE = 'melreads-voice';
const SHELL = ['./', 'index.html', 'content.js', 'sparkle.js', 'audio.js', 'sync.js', 'app.js', 'testkit.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== VOICE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// app files: network-first (updates show up right away), cached copy when offline.
// other sites (cloud save, fonts) are left to the browser.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  // voice clips never change (they're named by their text), so cache-first and keep them across releases.
  if (/\/voice\/.+\.mp3$/.test(new URL(e.request.url).pathname)) {
    e.respondWith(caches.open(VOICE).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }))));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { if (!r.ok) return r; const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)).catch(() => {}); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
