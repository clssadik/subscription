import { useEffect, useRef, useState } from 'react'

// Listenin en üstünde iOS gibi esneme + aşağı çekip yenileme. En altta esneme yok.
// En üstte çekince bütün sayfa (stage) aşağı iner, üstte açılan boşlukta yenileme halkası belirir.
// Bırakınca yumuşakça yerine döner (sekmeden).
const TOP_MAX = 180 // en üstte en fazla bu kadar esner (px)
const TRIGGER = 90 // bu kadar çekip bırakınca yenilenir (parmakla ~300px)
const HOLD = 60 // yenilenirken sayfa bu kadar aşağıda bekler
const SPRING = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)'

/** Çektikçe zorlaşan esneme: d = parmağın gittiği yol, max = sınır, k = ne kadar yolda yarıya ulaşacağı */
const rubber = (d: number, max: number, k: number) => max * (1 - 1 / (d / k + 1))

/**
 * İki ref: `scroller` kayan alan (dokunuşları dinler), `stage` bütün sayfa (üstte aşağı iner).
 * Çekme miktarı `stage`'e `--pull` (sayı) olarak yazılır.
 */
export function useElasticScroll(onRefresh?: () => Promise<void>) {
  // Ref yerine state: liste sonradan ekrana gelirse (ör. ilk kayıttan sonra) dinleyiciler o an bağlanır
  const [el, scroller] = useState<HTMLDivElement | null>(null)
  const [page, stage] = useState<HTMLDivElement | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // Her çizimde dinleyicileri yeniden kurmamak için en güncel işlevi ref'te tut
  const refresh = useRef(onRefresh)
  useEffect(() => {
    refresh.current = onRefresh
  })

  useEffect(() => {
    if (!el || !page) return
    let startY = 0
    let pull = 0
    let pulling = false
    let busy = false
    let wheelRaw = 0
    let wheelTimer = 0

    const set = (v: number, transition: string) => {
      pull = v
      page.style.transition = transition
      page.style.transform = v ? `translateY(${v}px)` : ''
      page.style.setProperty('--pull', String(v))
    }
    const atTop = () => el.scrollTop <= 0

    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      pulling = false
    }
    const onMove = (e: TouchEvent) => {
      if (busy) return
      const y = e.touches[0].clientY
      if (!pulling) {
        // Esneme ancak en üstteyken aşağı çekince başlar
        if (!(y > startY && atTop())) return
        pulling = true
        startY = y
        return
      }
      const d = y - startY
      if (d <= 0) {
        set(0, 'none')
        pulling = false
        return
      }
      e.preventDefault()
      set(rubber(d, TOP_MAX, 300), 'none')
    }
    const onEnd = async () => {
      if (pulling && pull >= TRIGGER && refresh.current) {
        busy = true
        setRefreshing(true)
        set(HOLD, SPRING)
        // Yenileme çok hızlı bitse de halka bir an görünsün
        await Promise.all([refresh.current(), new Promise((r) => setTimeout(r, 500))])
        setRefreshing(false)
        busy = false
      }
      pulling = false
      set(0, SPRING)
    }
    // Bilgisayarda fare tekerleği / dokunmatik yüzey: en üstte küçük bir esneme, hareketi gecikmesiz takip eder; bitince hızla döner
    const onWheel = (e: WheelEvent) => {
      if (busy || e.deltaY > 0 || !atTop()) return
      wheelRaw = Math.min(600, wheelRaw - e.deltaY)
      set(rubber(wheelRaw, 12, 40), 'none')
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
  }, [el, page])

  return { scroller, stage, refreshing, trigger: TRIGGER }
}
