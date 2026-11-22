// Service worker: l'app funziona anche offline dopo la prima apertura.
// Cambia VERSION a ogni aggiornamento per forzare il refresh della cache.
const VERSION = 'keystart-v3';
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest'];
// Il resto (script, font, icone) viene salvato in cache alla prima apertura.

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

// Prima la rete (così vedi subito gli aggiornamenti), poi la cache se sei offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)));
});
