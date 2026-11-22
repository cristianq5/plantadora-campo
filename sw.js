/* Service worker de la app de la plantadora.
   - La página y sus archivos: primero la red (si hay internet, siempre la última versión publicada);
     sin red, la última copia guardada. Así se actualiza sola cada vez que se abre con cobertura.
   - Librerías del CDN (Leaflet, Turf): de la copia guardada, y se refresca por detrás.
   - Mapas, SIGPAC, Catastro y terreno: no se guardan (pesan mucho y cambian); sin red no se ven. */
const CACHE = 'plantadora-v1';
const CDN = 'https://cdnjs.cloudflare.com/';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./plantadora.html', './manifest.webmanifest', './icono-192.png', './icono-512.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(r, { cache: 'no-cache' }).then((resp) => {
      if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(r, copia)); }
      return resp;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then((x) => x || caches.match('./plantadora.html'))));
  } else if (r.url.startsWith(CDN)) {
    e.respondWith(caches.match(r).then((x) => {
      const red = fetch(r).then((resp) => { if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(r, copia)); } return resp; });
      return x || red;
    }));
  }
});
