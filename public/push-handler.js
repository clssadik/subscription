// Bildirimleri gösteren ve dokununca uygulamayı açan kısım. Workbox'ın ürettiği servis çalışanına eklenir (vite.config.ts → importScripts).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Subly', {
      body: data.body || '',
      tag: data.tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
