import { flushSync } from 'react-dom'

/** Sayfa geçiş türleri. Animasyonlar src/index.css'te (::view-transition, html[data-motion=…]). */
export type Motion = 'push' | 'pop' | 'fade' | 'tab-right' | 'tab-left'

/**
 * Ekranı değiştiren güncellemeyi iPhone tarzı bir geçişle yapar (View Transitions, iOS 18+).
 * Tarayıcı desteklemiyorsa ya da hareket azaltılmışsa güncellemeyi hemen yapar ve false döner.
 */
export function transition(motion: Motion, update: () => void) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return false
  }
  document.documentElement.dataset.motion = motion
  busyUntil = Infinity
  const t = document.startViewTransition(() => flushSync(update))
  // Sayfa arka plandayken ya da arka arkaya basınca geçiş atlanır; güncelleme yine yapılır, hata sayılmasın
  const ignore = () => {}
  t.ready.catch(ignore)
  // Geçiş hatayla bitse bile kilit kalkmalı (yoksa hiçbir hareket kaydırmaz)
  const settle = () => (busyUntil = performance.now() + SETTLE_MS)
  t.finished.then(() => {
    settle()
    wakeScrollers()
  }, settle)
  return true
}

// Geçiş sürerken ve bittikten hemen sonra (telefon dokunuşun yerini bir an daha eski katmana göre buluyor) dokunuş sayfaların değil
// boş belgenin (html) üstüne düşer. iPhone Safari o hareketle bütün belgeyi esnetir; belge esneyip geri dönerken gelen her yeni
// dokunuş da onu yakalar: liste hiç kaymaz, kilitlenmiş gibi görünür. Belgenin kendisi hiç kaymamalı.
const SETTLE_MS = 250
let busyUntil = 0

/**
 * Belgeyi kaydıracak hareketleri durdurur: geçiş sürerken ya da yeni bitmişken, boş belgeye başlayan ya da belge hâlâ esnemişken
 * başlayan hareketler. Bu hareket boşa gitmesin diye açık sayfanın listesi parmağı elle izler (bırakınca kayma devam etmez).
 * Dokunma/tıklama etkilenmez. src/main.tsx açılışta bir kez çağırır.
 */
export function guardDocumentScroll() {
  let drag: { y: number; list: HTMLElement | null } | null = null
  const opts = { capture: true, passive: true }
  window.addEventListener(
    'touchstart',
    (e) => {
      const t = e.target
      const risky = performance.now() < busyUntil || t === document.documentElement || t === document.body || window.scrollY !== 0
      drag = risky ? { y: e.touches[0].clientY, list: document.querySelector<HTMLElement>('[data-screen-active] [data-scroller]') } : null
    },
    opts,
  )
  window.addEventListener(
    'touchmove',
    (e) => {
      if (!drag || !e.cancelable) return
      e.preventDefault()
      const y = e.touches[0].clientY
      if (drag.list) drag.list.scrollTop -= y - drag.y
      drag.y = y
    },
    { capture: true, passive: false },
  )
  const end = () => (drag = null)
  window.addEventListener('touchend', end, opts)
  window.addEventListener('touchcancel', end, opts)
}

/**
 * iPhone'da geçiş animasyonu sırasında oluşturulan kayan alan, ekrana bir kez dokunulana kadar parmakla kaymıyor (kilitli kalıyor).
 * Geçiş bitince her kayan alanın taşmasını bir anlığına kapatıp açarak telefonun onu yeniden tanımasını sağlar; kaydırma yeri korunur.
 */
export function wakeScrollers() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-scroller]')) {
    const top = el.scrollTop
    el.style.overflowY = 'hidden'
    void el.offsetHeight
    el.style.overflowY = ''
    // 1px kaydırıp geri al: telefon kayan alanı programla kaydırılınca da yeniden tanıyor
    el.scrollTop = top + 1
    el.scrollTop = top
  }
}
