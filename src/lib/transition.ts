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
  running = t
  // Sayfa arka plandayken ya da arka arkaya basınca geçiş atlanır; güncelleme yine yapılır, hata sayılmasın
  const ignore = () => {}
  t.ready.catch(ignore)
  // Geçiş hatayla bitse bile kilit kalkmalı (yoksa hiçbir hareket kaydırmaz)
  const settle = () => {
    busyUntil = performance.now() + SETTLE_MS
    if (running === t) running = null
  }
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
/** Süren sayfa geçişi: ekrana dokunulunca hemen bitirilir (geçiş sürerken liste kaydırılamıyor, beklemek gerekmesin) */
let running: ViewTransition | null = null

/**
 * Belgeyi kaydıracak hareketleri durdurur: geçiş sürerken ya da yeni bitmişken, boş belgeye başlayan ya da belge hâlâ esnemişken
 * başlayan hareketler. Bu hareket boşa gitmesin diye açık sayfanın listesi parmağı elle izler, bırakınca iPhone'daki gibi süzülür.
 * Dokunma/tıklama etkilenmez. src/main.tsx açılışta bir kez çağırır.
 */
export function guardDocumentScroll() {
  let drag: { y: number; t: number; v: number; list: HTMLElement | null } | null = null
  let glide = 0
  const opts = { capture: true, passive: true }
  window.addEventListener(
    'touchstart',
    (e) => {
      cancelAnimationFrame(glide)
      // iPhone'daki gibi: geçiş sürerken dokununca animasyon kesilir, sayfa hemen son hâline gelir ve parmak onu kaydırır
      running?.skipTransition()
      const t = e.target
      // Alttan açılan panel (ekleme/düzenleme) kendi kaydırmasını yönetir; klavye açıkken sayfa kaymış olsa da dokunulmaz
      if (t instanceof Element && t.closest('[data-vaul-drawer]')) {
        drag = null
        return
      }
      const risky = performance.now() < busyUntil || t === document.documentElement || t === document.body || window.scrollY !== 0
      // Liste ilk harekette seçilir: dokunuş anında açık sayfa değişebiliyor (ör. sağa çekip kapanan sayfa hemen bitirilir)
      drag = risky ? { y: e.touches[0].clientY, t: e.timeStamp, v: 0, list: null } : null
    },
    opts,
  )
  window.addEventListener(
    'touchmove',
    (e) => {
      if (!drag || !e.cancelable) return
      e.preventDefault()
      const y = e.touches[0].clientY
      const dt = e.timeStamp - drag.t
      // Parmağın hızı (px/ms, yumuşatılmış): bırakınca liste bu hızla kaymaya devam eder
      if (dt > 0) drag.v = 0.7 * ((drag.y - y) / dt) + 0.3 * drag.v
      drag.list ??= document.querySelector<HTMLElement>('[data-screen-active] [data-scroller]')
      if (drag.list) drag.list.scrollTop += drag.y - y
      drag.y = y
      drag.t = e.timeStamp
    },
    { capture: true, passive: false },
  )
  window.addEventListener(
    'touchend',
    (e) => {
      const d = drag
      drag = null
      // Parmak durup öyle kalktıysa ya da hareket yoksa süzülme yok
      if (!d?.list || e.timeStamp - d.t > 80 || Math.abs(d.v) < 0.1) return
      // iPhone'daki gibi süzülme: hız her milisaniyede biraz azalır, liste ucuna gelince durur
      const list = d.list
      let v = d.v
      const max = list.scrollHeight - list.clientHeight
      let pos = list.scrollTop
      let last = performance.now()
      const step = (now: number) => {
        const dt = now - last
        last = now
        pos = Math.min(max, Math.max(0, pos + v * dt))
        list.scrollTop = pos
        v *= Math.pow(0.997, dt)
        if (Math.abs(v) > 0.02 && pos > 0 && pos < max) glide = requestAnimationFrame(step)
      }
      glide = requestAnimationFrame(step)
    },
    opts,
  )
  window.addEventListener('touchcancel', () => (drag = null), opts)
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
