import { useRef } from 'react'
import { haptic } from './haptics'

/** Basılı tutma süresi (ms): bu kadar tutunca açılır */
export const HOLD_MS = 420

/**
 * Basılı tutunca çalışan hareket (abonelik/kart satırları: sayfası açılır). Parmak kayarsa (liste kaydırılıyorsa) iptal olur.
 * Basılı tutma çalıştıysa ardından gelen "tıklama" yutulur, iki kez açılmaz.
 */
export function useLongPress(action: () => void) {
  const timer = useRef(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)
  const cancel = () => {
    window.clearTimeout(timer.current)
    start.current = null
  }
  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      timer.current = window.setTimeout(() => {
        start.current = null
        fired.current = true
        haptic()
        action()
      }, HOLD_MS)
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = start.current
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture: (e: React.MouseEvent) => {
      if (!fired.current) return
      fired.current = false
      e.preventDefault()
      e.stopPropagation()
    },
  }
}
