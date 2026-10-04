import { useRef, useState, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

/** Dolma süresi (ms) */
const HOLD = 800

/**
 * Basılı tutunca çalışan düğme (yanlışlıkla dokunmayla olmasın diye): içi soldan sağa dolar, dolunca onConfirm çalışır.
 * Erken bırakınca dolum geri çekilir. Kısa dokunuşta düğme hafifçe sallanır ve "Basılı tut" yazar.
 */
export function HoldToConfirm({ children, onConfirm, className }: { children: ReactNode; onConfirm: () => void; className?: string }) {
  const [holding, setHolding] = useState(false)
  const [nudge, setNudge] = useState(0)
  // Kısa dokunuştan sonra bir süre "Basılı tut" yazar
  const [hint, setHint] = useState(false)
  const hintTimer = useRef(0)
  const timer = useRef(0)
  const startedAt = useRef(0)

  const begin = () => {
    startedAt.current = performance.now()
    setHolding(true)
    timer.current = window.setTimeout(() => {
      setHolding(false)
      onConfirm()
    }, HOLD)
  }
  const end = () => {
    if (!startedAt.current) return
    const short = performance.now() - startedAt.current < 250
    startedAt.current = 0
    window.clearTimeout(timer.current)
    setHolding(false)
    if (short) {
      haptic()
      setNudge((n) => n + 1)
      setHint(true)
      window.clearTimeout(hintTimer.current)
      hintTimer.current = window.setTimeout(() => setHint(false), 1600)
    }
  }

  return (
    <button
      type="button"
      onPointerDown={begin}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      // Klavyeyle: Enter basılı tutulunca da aynı
      onKeyDown={(e) => !e.repeat && (e.key === 'Enter' || e.key === ' ') && begin()}
      onKeyUp={end}
      className={cn('relative overflow-hidden select-none', className)}
    >
      {/* Dolum: basılı tutarken soldan sağa dolar, bırakınca hızlıca geri çekilir */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-current opacity-15"
        style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${HOLD}ms linear` : 'width 200ms ease-out' }}
      />
      {/* key: her kısa dokunuşta sallanma baştan oynar */}
      <span key={nudge} className={cn('relative block', nudge > 0 && 'hold-nudge')}>{hint && !holding ? 'Basılı tut' : children}</span>
    </button>
  )
}
