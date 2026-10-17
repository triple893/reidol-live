const CACHE = 'reidol-d98da9f1e2';
const FILES = ["./", "index.html", "manifest.webmanifest", "assets/aira_face.jpg", "assets/aira_full.webp", "assets/arisu_face.jpg", "assets/arisu_full.webp", "assets/bg_1.jpg", "assets/bg_2.jpg", "assets/bg_3.jpg", "assets/bg_4.jpg", "assets/bg_5.jpg", "assets/bg_6.jpg", "assets/fuka_face.jpg", "assets/fuka_full.webp", "assets/nana_face.jpg", "assets/nana_full.webp", "assets/neiro_face.jpg", "assets/neiro_full.webp", "assets/ruri_face.jpg", "assets/ruri_full.webp", "assets/saaya_face.jpg", "assets/saaya_full.webp", "assets/story_0.jpg", "assets/story_1.jpg", "assets/story_2.jpg", "assets/story_3.jpg", "assets/story_4.jpg", "assets/story_5.jpg", "assets/story_6.jpg", "icons/icon_180.png", "icons/icon_192.png", "icons/icon_512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => r)));
});
