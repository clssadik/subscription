import { useEffect, useRef, useState } from 'react'

// Liste uçlarında iOS gibi esneme + en üstte aşağı çekip yenileme.
// İçerik parmağı yavaşlayarak takip eder (çektikçe zorlaşır), bırakınca yay gibi yerine döner.
const MAX = 140 // en fazla bu kadar esner (px)
const TRIGGER = 72 // bu kadar çekip bırakınca yenilenir
const HOLD = 56 // yenilenirken içerik bu kadar aşağıda bekler
const rubber = (d: number) => MAX * (1 - 1 / ((d * 0.55) / MAX + 1))

/**
 * `scroller` kayan alanın, `content` onun içindeki sarmalayıcının `ref`'ine verilir.
 * Çekme miktarı kayan alana `--pull` (px, sayı) olarak yazılır; yenileme göstergesi bunu okur.
 */
export function useElasticScroll(onRefresh?: () => Promise<void>) {
  // Ref yerine state: liste sonradan ekrana gelirse (ör. ilk kayıttan sonra) dinleyiciler o an bağlanır
  const [el, scroller] = useState<HTMLDivElement | null>(null)
  const [inner, content] = useState<HTMLDivElement | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // Her çizimde dinleyicileri yeniden kurmamak için en güncel işlevi ref'te tut
  const refresh = useRef(onRefresh)
  useEffect(() => {
    refresh.current = onRefresh
  })

  useEffect(() => {
    if (!el || !inner) return
    let startY = 0
    let pull = 0
    let edge: 'top' | 'bottom' | null = null
    let busy = false
    let wheelTimer = 0

    const set = (v: number, animate: boolean) => {
      pull = v
      inner.style.transition = animate ? 'transform 500ms cubic-bezier(0.2, 0.9, 0.25, 1.1)' : 'none'
      inner.style.transform = v ? `translateY(${v}px)` : ''
      el.style.setProperty('--pull', String(Math.max(0, v)))
    }
    const atTop = () => el.scrollTop <= 0
    const atBottom = () => el.scrollTop + el.clientHeight >= el.scrollHeight - 1

    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      edge = null
    }
    const onMove = (e: TouchEvent) => {
      if (busy) return
      const y = e.touches[0].clientY
      if (edge === null) {
        // Esneme ancak uçtayken ve uca doğru çekince başlar
        if (y > startY && atTop()) edge = 'top'
        else if (y < startY && atBottom()) edge = 'bottom'
        else return
        startY = y
        return
      }
      const d = y - startY
      if ((edge === 'top' && d <= 0) || (edge === 'bottom' && d >= 0)) {
        set(0, false)
        edge = null
        return
      }
      e.preventDefault()
      set(edge === 'top' ? rubber(d) : -rubber(-d), false)
    }
    const onEnd = async () => {
      if (edge === 'top' && pull >= TRIGGER && refresh.current) {
        busy = true
        setRefreshing(true)
        set(HOLD, true)
        // Yenileme çok hızlı bitse de halka bir an görünsün
        await Promise.all([refresh.current(), new Promise((r) => setTimeout(r, 700))])
        setRefreshing(false)
        busy = false
      }
      edge = null
      set(0, true)
    }
    // Bilgisayarda fare tekerleği: uçta küçük bir esneme, kısa süre sonra geri döner
    const onWheel = (e: WheelEvent) => {
      if (busy) return
      const down = e.deltaY > 0
      if ((down && atBottom()) || (!down && atTop())) {
        set(Math.max(-40, Math.min(40, pull - e.deltaY * 0.2)), false)
        clearTimeout(wheelTimer)
        wheelTimer = window.setTimeout(() => set(0, true), 120)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      clearTimeout(wheelTimer)
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [el, inner])

  return { scroller, content, refreshing }
}
