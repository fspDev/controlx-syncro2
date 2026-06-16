// Service worker mínimo — solo existe para cumplir el criterio de
// instalabilidad de PWA. No cachea nada (la app ya usa IndexedDB para
// persistencia local); deja pasar todas las requests sin intervenir.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // No-op: deja que el navegador maneje la request normalmente
})
