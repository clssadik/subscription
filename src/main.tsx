import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { keepPageInPlace } from '@/lib/keyboard'
import { guardDocumentScroll } from '@/lib/transition'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Açılış ekranını (index.html #splash) göründüğü andan itibaren 1 sn gösterip soldurarak kaldır.
// Uygulama daha geç yüklenirse yüklenince kalkar (boş sayfa görünmesin).
const splash = document.getElementById('splash')
if (splash) {
  const shownAt = (window as Window & { splashAt?: number }).splashAt ?? 0
  const wait = Math.max(0, shownAt + 1000 - performance.now())
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
