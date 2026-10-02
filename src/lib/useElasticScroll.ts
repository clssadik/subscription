import { useEffect, useRef, useState } from 'react'

// Liste uçlarında iOS gibi esneme + en üstte aşağı çekip yenileme.
// En üstte çekince bütün sayfa (stage) aşağı iner, üstte açılan boşlukta yenileme halkası belirir.
// En altta çekince sadece liste (content) hafifçe yukarı esner. Bırakınca yumuşakça yerine döner (sekmeden).
const TOP_MAX = 180 // en üstte en fazla bu kadar esner (px)
const TRIGGER = 90 // bu kadar çekip bırakınca yenilenir (parmakla ~300px)
const HOLD = 60 // yenilenirken sayfa bu kadar aşağıda bekler
const BOTTOM_MAX = 70 // en altta en fazla bu kadar esner
const SPRING = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)'

/** Çektikçe zorlaşan esneme: d = parmağın gittiği yol, max = sınır, k = ne kadar yolda yarıya ulaşacağı */
const rubber = (d: number, max: number, k: number) => max * (1 - 1 / (d / k + 1))

/**
 * Üç ref: `scroller` kayan alan (dokunuşları dinler), `content` onun içindeki sarmalayıcı (altta esner),
 * `stage` bütün sayfa (üstte aşağı iner). Çekme miktarı `stage`'e `--pull` (sayı) olarak yazılır.
 */
export function useElasticScroll(onRefresh?: () => Promise<void>) {
  // Ref yerine state: liste sonradan ekrana gelirse (ör. ilk kayıttan sonra) dinleyiciler o an bağlanır
  const [el, scroller] = useState<HTMLDivElement | null>(null)
  const [inner, content] = useState<HTMLDivElement | null>(null)
  const [page, stage] = useState<HTMLDivElement | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // Her çizimde dinleyicileri yeniden kurmamak için en güncel işlevi ref'te tut
  const refresh = useRef(onRefresh)
  useEffect(() => {
    refresh.current = onRefresh
  })

  useEffect(() => {
    if (!el || !inner || !page) return
    let startY = 0
    let pull = 0 // + üstte (sayfa aşağı), - altta (liste yukarı)
    let edge: 'top' | 'bottom' | null = null
    let busy = false
    let wheelRaw = 0
    let wheelTimer = 0

    const set = (v: number, transition: string) => {
      pull = v
      const top = Math.max(0, v)
      const bottom = Math.min(0, v)
      page.style.transition = inner.style.transition = transition
      page.style.transform = top ? `translateY(${top}px)` : ''
      inner.style.transform = bottom ? `translateY(${bottom}px)` : ''
      page.style.setProperty('--pull', String(top))
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
        set(0, 'none')
        edge = null
        return
      }
      e.preventDefault()
      set(edge === 'top' ? rubber(d, TOP_MAX, 300) : -rubber(-d, BOTTOM_MAX, 200), 'none')
    }
    const onEnd = async () => {
      if (edge === 'top' && pull >= TRIGGER && refresh.current) {
        busy = true
        setRefreshing(true)
        set(HOLD, SPRING)
        // Yenileme çok hızlı bitse de halka bir an görünsün
        await Promise.all([refresh.current(), new Promise((r) => setTimeout(r, 500))])
        setRefreshing(false)
        busy = false
      }
      edge = null
      set(0, SPRING)
    }
    // Bilgisayarda fare tekerleği / dokunmatik yüzey: uçta küçük bir esneme, hareketi gecikmesiz takip eder; bitince hızla döner
    const onWheel = (e: WheelEvent) => {
      if (busy) return
      const down = e.deltaY > 0
      if (!((down && atBottom()) || (!down && atTop()))) return
      wheelRaw = Math.max(-600, Math.min(600, wheelRaw + e.deltaY))
      const v = rubber(Math.abs(wheelRaw), BOTTOM_MAX, 200) * (wheelRaw > 0 ? -1 : 1)
      set(v, 'none')
      clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        wheelRaw = 0
        set(0, SPRING)
      }, 80)
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
  }, [el, inner, page])

  return { scroller, content, stage, refreshing, trigger: TRIGGER }
}
