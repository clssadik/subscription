import { useEffect, useRef } from 'react'
import { haptic } from './haptics'

/** Basılı tutma süresi (ms): bu kadar tutunca açılır */
export const HOLD_MS = 420

/**
 * Basılı tutunca çalışan hareket (abonelik/kart satırları: sayfası açılır). Parmak kayarsa (liste kaydırılıyorsa) iptal olur.
 * Basılı tutma çalıştıysa ardından gelen "tıklama" yutulur, iki kez açılmaz. İkinci parmak yok sayılır; sayfa kapanınca
 * bekleyen basılı tutma çalışmaz.
 */
export function useLongPress(action: () => void) {
  const timer = useRef(0)
  // Basışı başlatan parmağın konumu ve kimliği
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const fired = useRef(false)
  const cancel = () => {
    window.clearTimeout(timer.current)
    start.current = null
  }
  // Başka parmağın bırakılması ya da iptali bu basışı bitirmesin
  const release = (e: React.PointerEvent) => {
    if (start.current?.id === e.pointerId) cancel()
  }
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
    },
    [],
  )
  return {
    onPointerDown: (e: React.PointerEvent) => {
      // İkinci parmak ilk basış sürerken yok sayılır (zamanlayıcı ezilip yetim kalmasın)
      if (start.current && start.current.id !== e.pointerId) return
      window.clearTimeout(timer.current)
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
      timer.current = window.setTimeout(() => {
        start.current = null
        fired.current = true
        haptic()
        action()
      }, HOLD_MS)
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current
      if (s && s.id === e.pointerId && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) cancel()
    },
    onPointerUp: release,
    onPointerCancel: release,
    onPointerLeave: release,
    onClickCapture: (e: React.MouseEvent) => {
      if (!fired.current) return
      fired.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }
}
