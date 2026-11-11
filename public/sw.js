/* Service worker de Studree (Fase 16, ADR-025): instala la app y deja abrir el
 * shell sin conexión. Sin dependencias.
 *
 * Reglas (docs/features/mobile.md):
 * - CACHE-FIRST solo para el shell: `/assets/` (Vite), `/icons/`, `/logo.jpg` y
 *   la fuentes de Google. Son archivos con hash o inmutables.
 * - NETWORK-FIRST para navegaciones (SPA): si no hay red, se muestra el shell
 *   cacheado; los datos vienen de la cache de localStorage (ADR-007).
 * - NUNCA se cachea Supabase (base, Storage, auth) ni las Edge Functions
 *   (`functions/v1`): los datos del usuario no viven en un cache compartido.
 *
 * `CACHE` lleva versión: al desplegar una build nueva, la anterior se borra en
 * `activate` y el navegador reemplaza el SW con la próxima visita.
 */

const CACHE = 'studree-shell-v2'

const SHELL = ['/', '/logo.jpg', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest']

/** Orígenes cuyas respuestas sí se pueden guardar en cache (fuentes). */
const CACHEABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

const isCacheablePath = (pathname) =>
  pathname.startsWith('/assets/') || pathname.startsWith('/icons/') || pathname === '/logo.jpg' || pathname === '/manifest.webmanifest'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin
  if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return

  // Navegación: red primero; sin red, el shell guardado.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/', copy))
          }
          return response
        })
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match('/'))),
    )
    return
  }

  // Assets y fuentes: cache primero; si no está, red (y se guarda si sirvió).
  if (sameOrigin ? isCacheablePath(url.pathname) : request.destination === 'style' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})
