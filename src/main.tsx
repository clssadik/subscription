import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { keepPageInPlace } from '@/lib/keyboard'
import { guardDocumentScroll } from '@/lib/transition'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Açılış ekranını (index.html #splash) göründüğü andan itibaren 2 sn gösterip soldurarak kaldır.
// Uygulama daha geç yüklenirse yüklenince kalkar (boş sayfa görünmesin).
const splash = document.getElementById('splash')
if (splash) {
  const shownAt = (window as Window & { splashAt?: number }).splashAt ?? 0
  const wait = Math.max(0, shownAt + 2000 - performance.now())
  window.setTimeout(() => {
    splash.classList.add('hide')
    window.setTimeout(() => splash.remove(), 400)
  }, wait)
}

// Uygulamaya geri dönünce (ana ekrandan) sayfa kaymış kalmasın: belge hiç kaymamalı, en başa sıfırla
const resetPage = () => document.visibilityState === 'visible' && window.scrollTo(0, 0)
document.addEventListener('visibilitychange', resetPage)
window.addEventListener('pageshow', resetPage)

// Sayfa geçişine denk gelen hareketler bütün belgeyi kaydırıp listeyi kilitlemesin (src/lib/transition.ts)
guardDocumentScroll()

// Klavye açılınca sayfa gereksiz yere yukarı kaymasın (src/lib/keyboard.ts)
keepPageInPlace()

// Kopyalama kapalı: yazı alanları dışında kopyalama, kesme ve sağ tık menüsü engellenir (görünüm: src/index.css)
const inField = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('input, textarea, [contenteditable="true"]')
for (const type of ['copy', 'cut', 'contextmenu'] as const) {
  document.addEventListener(type, (e) => {
    if (!inField(e.target)) e.preventDefault()
  })
}

// Servis çalışanı (vite.config.ts: autoUpdate). Yeni sürüm gelince sayfa kendiliğinden yenilenir; yazı yazılırken
// yenilenmesin diye bir alan odaktaysa yenileme, alan bırakılınca ya da uygulama tekrar öne gelince yapılır.
let reloadWaiting = false
const editing = () => inField(document.activeElement)
const reloadIfIdle = () => {
  if (reloadWaiting && !editing()) window.location.reload()
}
registerSW({
  immediate: true,
  onNeedReload() {
    if (editing()) reloadWaiting = true
    else window.location.reload()
  },
  onRegisteredSW(_url, registration) {
    // Uygulama günlerce açık kalabiliyor; öne gelince yeni sürüm var mı diye bakılır
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      registration?.update().catch(() => {})
      reloadIfIdle()
    })
  },
})
// Odak bir alandan çıkınca bekleyen yenileme yapılır (odak taşınması bir an sonra bakılır)
document.addEventListener('focusout', () => {
  setTimeout(reloadIfIdle)
})
