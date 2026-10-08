// Bildirimleri gösteren ve dokununca uygulamayı açan kısım. Workbox'ın ürettiği servis çalışanına eklenir (vite.config.ts → importScripts).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Monthwise', {
      body: data.body || '',
      tag: data.tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: data.url || '/' },
    }),
  )
})

// Push servisi aboneliği yenilediğinde (ör. anahtar değişince) aynı ayarlarla yeniden abone olunur.
// Yeni adresi hesaba sayfa kaydeder (servis çalışanında oturum bilgisi yok): açık uygulamaya haber verilir, o hemen kaydeder
// (src/lib/push.ts). Açık pencere yoksa adres bir sonraki açılışta kaydedilir.
self.addEventListener('pushsubscriptionchange', (event) => {
  const options = (event.oldSubscription && event.oldSubscription.options) || { userVisibleOnly: true }
  event.waitUntil(
    self.registration.pushManager
      .subscribe(options)
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((list) => list.forEach((client) => client.postMessage({ type: 'push-subscription-changed' }))),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const url = data.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      const client = list.find((c) => 'focus' in c)
      if (!client) return self.clients.openWindow(url)
      const win = await client.focus().catch(() => client)
      try {
        // Açık pencere başka bir sayfadaysa oraya götürülür; zaten oradaysa yeniden yüklenmez
        if (new URL(win.url).pathname !== new URL(url, self.location.origin).pathname) await win.navigate(url)
      } catch {
        // Bu tarayıcı pencereyi yönlendiremiyorsa açık kalır
      }
    }),
  )
})
