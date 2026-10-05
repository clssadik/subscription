import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { guardDocumentScroll } from '@/lib/transition'

// GEÇİCİ: ana ekran uygulamasında ekran ölçülerini üstte küçük bir yazıyla gösterir (sayfa boyu hatası için)
if (matchMedia('(display-mode: standalone)').matches || location.search.includes('vh')) {
  const probe = (h: string) => {
    const d = document.createElement('div')
    d.style.cssText = `position:fixed;top:0;left:0;width:1px;height:${h};visibility:hidden`
    document.body.appendChild(d)
    const v = Math.round(d.getBoundingClientRect().height)
    d.remove()
    return v
  }
  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;left:8px;right:8px;top:50%;z-index:9999;pointer-events:none;background:#D9381E;color:#fff;font:13px/1.5 monospace;padding:8px 10px;border-radius:10px'
  const draw = () => {
    box.textContent = [
      `inner ${innerHeight} · client ${document.documentElement.clientHeight} · vv ${Math.round(visualViewport?.height ?? 0)} · screen ${screen.height}`,
      `vh ${probe('100vh')} · svh ${probe('100svh')} · lvh ${probe('100lvh')} · dvh ${probe('100dvh')}`,
      `safeTop ${probe('env(safe-area-inset-top)')} · safeBottom ${probe('env(safe-area-inset-bottom)')}`,
    ].join('\n')
    box.style.whiteSpace = 'pre-wrap'
  }
  window.addEventListener('load', () => {
    document.body.appendChild(box)
    draw()
    window.setInterval(draw, 1000)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Açılış ekranını (index.html #splash) en az ~1 sn gösterip soldurarak kaldır
const splash = document.getElementById('splash')
if (splash) {
  const wait = Math.max(0, 1000 - performance.now())
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

// Kopyalama kapalı: yazı alanları dışında kopyalama, kesme ve sağ tık menüsü engellenir (görünüm: src/index.css)
const inField = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('input, textarea, [contenteditable="true"]')
for (const type of ['copy', 'cut', 'contextmenu'] as const) {
  document.addEventListener(type, (e) => {
    if (!inField(e.target)) e.preventDefault()
  })
}
