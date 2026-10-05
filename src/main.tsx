import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { guardDocumentScroll } from '@/lib/transition'

// GEÇİCİ: ?vh ile açılınca ekran ölçülerini gösterir (ana ekran uygulamasında sayfa boyu hatası için)
function showViewportProbe() {
  const probe = (h: string) => {
    const d = document.createElement('div')
    d.style.cssText = `position:fixed;top:0;left:0;width:1px;height:${h};visibility:hidden`
    document.body.appendChild(d)
    const v = Math.round(d.getBoundingClientRect().height)
    d.remove()
    return v
  }
  const rows = {
    standalone: matchMedia('(display-mode: standalone)').matches,
    innerHeight: innerHeight,
    clientHeight: document.documentElement.clientHeight,
    visualViewport: Math.round(visualViewport?.height ?? 0),
    screenHeight: screen.height,
    '100vh': probe('100vh'),
    '100svh': probe('100svh'),
    '100lvh': probe('100lvh'),
    '100dvh': probe('100dvh'),
    safeTop: probe('env(safe-area-inset-top)'),
    safeBottom: probe('env(safe-area-inset-bottom)'),
  }
  document.getElementById('splash')?.remove()
  document.body.innerHTML = `<pre style="font:16px/1.6 monospace;padding:70px 20px;color:#141414">${Object.entries(rows).map(([k, v]) => `${k}: ${v}`).join('\n')}</pre>`
}
if (location.search.includes('vh')) showViewportProbe()
// Ana ekran uygulamasında adres yazılamadığı için: ekranın en üstüne 2 saniyede 5 kez dokununca da açılır
let taps: number[] = []
document.addEventListener('click', (e) => {
  if (e.clientY > 120) return
  const now = Date.now()
  taps = [...taps.filter((t) => now - t < 2000), now]
  if (taps.length >= 5) showViewportProbe()
})

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
