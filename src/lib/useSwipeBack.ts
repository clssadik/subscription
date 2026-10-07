import { useEffect, useRef, type RefObject } from 'react'
import { reducedMotion, wakeScrollers } from './transition'

/** Bırakınca geri dönmek için en az bu kadar çekilmeli (ekran genişliğine oranla) ya da hızlıca fırlatılmalı (px/ms) */
const COMPLETE_AT = 0.3
const FLING = 0.35
// iOS'un sayfa geçişindeki eğri (sayfa açılış/kapanış geçişleriyle aynı, src/index.css): hızlı başlar, uzun ve yumuşak durur
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
/** Bırakınca kalan yolun süresi (ms): yavaş bırakılan da acele etmesin, hızlı fırlatılan da sürünmesin */
const MIN_MS = 380
const MAX_MS = 560
/** Gölge: sayfa kenarındaki koyuluk, sayfa sağa gittikçe söner */
const shadow = (p: number) => `-10px 0 30px rgb(0 0 0 / ${(0.18 * (1 - p)).toFixed(3)})`

/**
 * iPhone'daki gibi sağa çekerek geri dönme: detay sayfası parmağı izleyerek sağa kayar, alttan önceki sayfa (sola kaymış ve
 * kararmış hâlden) yerine gelir. Yeterince çekip bırakınca ya da hızlıca fırlatınca geri dönülür, yoksa sayfa yerine oturur.
 * Hareket sayfanın her yerinden başlayabilir (Safari'nin kenardaki kendi geri hareketine takılmasın). Sola/dikey hareketler
 * ve kendi yatay sürüklemesi olan öğeler ([data-no-swipe-back], ör. ödeme fişinin koçanı) etkilenmez.
 *
 * page: detay sayfası. under: altındaki önceki sayfa (yoksa sadece detay kayar). onBack: animasyonsuz geri dönüş;
 * bittiğinde önceki sayfa zaten yerinde olur.
 */
export function useSwipeBack(
  page: RefObject<HTMLElement | null>,
  { enabled, under, onBack, key }: { enabled: boolean; under: () => HTMLElement | null; onBack: () => void; key: string },
) {
  // Her çizimde güncel geri dönüş ve alt sayfa (hareket sürerken sekme değişmez, ama eski kapanışa takılmasın)
  const latest = useRef({ under, onBack })
  useEffect(() => {
    latest.current = { under, onBack }
  })
  useEffect(() => {
    const el = page.current
    if (!el || !enabled) return

    let start: { x: number; y: number; id: number } | null = null
    let active = false
    let below: HTMLElement | null = null
    let last = { x: 0, t: 0, v: 0 }
    const width = () => window.innerWidth

    // Detay sağa x kadar kaymışken iki sayfanın duruşu
    const place = (x: number) => {
      const p = Math.min(1, Math.max(0, x / width()))
      el.style.translate = `${x}px 0`
      el.style.boxShadow = shadow(p)
      if (below) {
        below.style.visibility = 'visible'
        below.style.translate = `${-30 * (1 - p)}% 0`
        below.style.filter = `brightness(${0.75 + 0.25 * p})`
      }
    }
    const clear = (node: HTMLElement | null) => {
      if (!node) return
      for (const a of node.getAnimations()) a.cancel()
      node.style.translate = ''
      node.style.boxShadow = ''
      node.style.visibility = ''
      node.style.filter = ''
    }

    const down = (e: PointerEvent) => {
      // Tek parmak: ikinci parmak, ilk parmak bitene kadar yok sayılır (yoksa sayfa yarım kayıp kalır)
      if (start && e.pointerId !== start.id) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if ((e.target as Element).closest('[data-no-swipe-back], input, textarea, select')) return
      // data-no-swipe-back="band": o yükseklikte ekranın tüm genişliği kapalı (kenardaki boşluktan başlayan parmak da)
      for (const band of el.querySelectorAll<HTMLElement>('[data-no-swipe-back="band"]')) {
        const r = band.getBoundingClientRect()
        if (e.clientY >= r.top && e.clientY <= r.bottom) return
      }
      start = { x: e.clientX, y: e.clientY, id: e.pointerId }
      active = false
    }
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (!active) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        // Sadece sağa ve belirgin yatay hareket; değilse bu dokunuş liste kaydırmasına kalır
        if (dx <= 0 || Math.abs(dx) < Math.abs(dy) * 1.2) {
          start = null
          return
        }
        active = true
        below = latest.current.under()
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          // parmak zaten kalkmışsa yakalanamaz; hareket yine izlenir
        }
        last = { x: e.clientX, t: e.timeStamp, v: 0 }
      }
      // Hız yumuşatılır: tek bir kare parmağın gerçek hızını yanlış gösterebiliyor
      const dt = e.timeStamp - last.t
      if (dt > 0) last = { x: e.clientX, t: e.timeStamp, v: 0.7 * ((e.clientX - last.x) / dt) + 0.3 * last.v }
      place(Math.max(0, dx))
    }
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return
      const dx = Math.max(0, e.clientX - start.x)
      start = null
      if (!active) return
      active = false
      // Parmak bir süre durup öyle kalktıysa fırlatma sayılmaz
      if (e.timeStamp - last.t > 80) last.v = 0
      const done = dx / width() > COMPLETE_AT || last.v > FLING
      const to = done ? width() : 0
      const p = dx / width()
      // Kalan yol bırakılan hıza göre ama sınırlar içinde; geri oturma hep aynı sakin sürede
      const ms = done ? Math.min(MAX_MS, Math.max(MIN_MS, ((to - dx) / Math.max(last.v, 0.6)) * 2)) : 420
      // Hareket azaltılmışsa animasyon atlanır: sayfa hemen son yerine (kapalıysa önceki sayfa) gider
      const options = { duration: reducedMotion() ? 0 : ms, easing: EASE, fill: 'forwards' as const }
      const anim = el.animate(
        [
          { translate: `${dx}px 0`, boxShadow: shadow(p) },
          { translate: `${to}px 0`, boxShadow: shadow(done ? 1 : 0) },
        ],
        options,
      )
      if (below) {
        below.animate(
          [
            { translate: `${-30 * (1 - p)}% 0`, filter: `brightness(${0.75 + 0.25 * p})` },
            { translate: done ? '0 0' : '-30% 0', filter: done ? 'brightness(1)' : 'brightness(0.75)' },
          ],
          options,
        )
      }
      const b = below
      if (!done) {
        anim.onfinish = () => {
          clear(el)
          clear(b)
        }
        return
      }
      // Detay kalkar, alt sayfa sekme olarak görünür hâle gelir; ardından elle verilen duruş silinir
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        window.removeEventListener('touchstart', early, true)
        window.removeEventListener('pointerdown', early, true)
        latest.current.onBack()
        clear(b)
        wakeScrollers()
      }
      // Sayfa kayarak kapanırken ekrana dokunulursa beklemeden bitir: o dokunuş önceki sayfayı hemen kaydırabilsin
      // (yoksa sayfa kapanana kadar dokunuş boşa gidiyordu)
      const early = () => {
        anim.cancel()
        finish()
      }
      window.addEventListener('touchstart', early, true)
      window.addEventListener('pointerdown', early, true)
      anim.onfinish = finish
    }
    const cancel = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return
      start = null
      if (active) {
        active = false
        clear(el)
        clear(below)
      }
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', cancel)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', cancel)
    }
    // key: her yeni detay sayfası yeni bir öğe
  }, [page, enabled, key])
}
