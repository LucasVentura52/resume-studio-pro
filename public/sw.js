const SHELL_CACHE = 'resume-studio-shell-v1'
const STATIC_CACHE = 'resume-studio-static-v1'
const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key === SHELL_CACHE || key === STATIC_CACHE) return Promise.resolve()
            return caches.delete(key)
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

const shouldHandleStaticRequest = (request, url) => {
  if (request.method !== 'GET') return false
  if (url.origin !== self.location.origin) return false
  return /\.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|json)$/.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match('/index.html')
          return (
            cached ||
            new Response('Offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          )
        }),
    )
    return
  }

  if (!shouldHandleStaticRequest(request, url)) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)

      return cached || network
    }),
  )
})
