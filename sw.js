/* Service worker de la app de la plantadora.
   - La página y sus archivos: primero la red (si hay internet, la última versión publicada); si la red no
     contesta en 3 s o no hay, la última copia guardada. Así se actualiza sola al abrirla con cobertura y
     abre rápido con una raya.
   - Librerías del CDN (Leaflet, Turf): se guardan al instalar y se refrescan por detrás. Sin ellas la
     página no arranca, así que tienen que estar aunque no haya red.
   - Mapas, SIGPAC, Catastro y terreno: no se guardan (pesan mucho y cambian); sin red no se ven. */
const CACHE = 'plantadora-v2';
const CDN = 'https://cdnjs.cloudflare.com/';
const LIBRERIAS = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js',
];
const PROPIOS = ['./plantadora.html', './manifest.webmanifest', './icono-192.png', './icono-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all([
    c.addAll(PROPIOS),
    ...LIBRERIAS.map((u) => fetch(u, { mode: 'cors' }).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null)),
  ])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const guardar = (r, resp) => { if (resp && (resp.ok || resp.type === 'opaque')) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(r, copia)); } return resp; };
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const copia = await caches.match(r, { ignoreSearch: true }) || await caches.match('./plantadora.html');
      const red = fetch(r, { cache: 'no-cache' }).then((resp) => guardar(r, resp));
      // Con copia guardada no se espera a la red más de 3 s; sin copia, se espera lo que haga falta.
      if (!copia) return red;
      const espera = new Promise((ok) => setTimeout(() => ok(null), 3000));
      const primero = await Promise.race([red.catch(() => null), espera]);
      if (!primero) red.catch(() => {});
      return primero && primero.ok ? primero : copia;
    })());
  } else if (r.url.startsWith(CDN)) {
    e.respondWith(caches.match(r, { ignoreVary: true }).then((x) => {
      const red = fetch(r).then((resp) => guardar(r, resp)).catch(() => null);
      return x || red.then((resp) => resp || Response.error());
    }));
  }
});
