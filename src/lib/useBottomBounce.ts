import { useEffect, type RefObject } from 'react'

// Listenin sonunda iPhone sadece listeyi esnetir ve bunu sayfaya bildirmez. Orada telefonun esnemesi durdurulur,
// yerine bütün sayfa (başlık, blok, liste) birlikte yukarı esner; bırakınca yumuşakça yerine döner.
// En üstteki esneme telefonun kendisinin: başlık ve blok kayan alanın içinde olduğu için listeyle birlikte iner.
const MAX = 140 // en fazla bu kadar (px) çıkar
const SOFT = 220 // çektikçe zorlaşır: bu kadar çekince yarı yola gelir
const BACK = 'transform 420ms cubic-bezier(0.25, 1, 0.5, 1)'

/** `scroller` kayan alan (dokunuşları dinler), `page` esneyen bütün sayfa. `key` değişince (ör. liste ilk kez ekrana gelince) yeniden bağlanır. */
export function useBottomBounce(scroller: RefObject<HTMLElement | null>, page: RefObject<HTMLElement | null>, key?: unknown) {
  useEffect(() => {
    const el = scroller.current
    const pg = page.current
    if (!el || !pg) return
    let startY = 0
    let pulling = false
    const atBottom = () => el.scrollTop + el.clientHeight >= el.scrollHeight - 1
    const set = (v: number, transition: string) => {
      pg.style.transition = transition
      pg.style.transform = v ? `translateY(${-v}px)` : ''
    }
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      pulling = false
    }
    const onMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY
      if (!pulling) {
        if (!(y < startY && atBottom())) return
        pulling = true
        startY = y
        return
      }
      const d = startY - y
      if (d <= 0) {
        set(0, 'none')
        pulling = false
        return
      }
      e.preventDefault()
      set(MAX * (1 - 1 / (d / SOFT + 1)), 'none')
    }
    const onEnd = () => {
      if (pulling) set(0, BACK)
      pulling = false
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [scroller, page, key])
}
