import { Trash2Icon, type LucideIcon } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const OPEN = -84

/** Sola kaydırınca altından kırmızı "Sil" (ya da actionLabel) çıkan satır. Dokununca onTap çalışır. */
export function SwipeRow({
  children,
  onTap,
  onDelete,
  className,
  surface = 'bg-surface',
  actionLabel = 'Sil',
  actionIcon: ActionIcon = Trash2Icon,
}: {
  children: ReactNode
  onTap?: () => void
  onDelete: () => void
  className?: string
  actionLabel?: string
  actionIcon?: LucideIcon
  /** Satırın zemin rengi (kırmızı "Sil"in üstünü örtmesi için opak olmalı) */
  surface?: string
}) {
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; base: number; dir: 'h' | 'v' | null } | null>(null)
  // Basılı tutunca satır hafifçe küçülür. Kısa gecikme: kaydırmaya başlayan parmak satırı küçültmesin.
  const [pressed, setPressed] = useState(false)
  const pressTimer = useRef(0)
  const release = () => {
    clearTimeout(pressTimer.current)
    setPressed(false)
  }

  return (
    <div className={cn('relative overflow-hidden rounded-[18px] transition-transform duration-100', pressed && 'scale-[0.98]', className)}>
      <button
        onClick={onDelete}
        aria-label={actionLabel}
        tabIndex={x === 0 ? -1 : 0}
        // Kaydırılmadıkça gizli; yoksa yuvarlak köşenin arkasından ince kırmızı bir çizgi sızıyor
        style={{ visibility: x === 0 && !dragging ? 'hidden' : 'visible' }}
        className="absolute inset-y-0 right-0 flex w-[84px] items-center justify-center gap-1 bg-bh-red text-sm font-medium text-white"
      >
        <ActionIcon className="size-4" /> {actionLabel}
      </button>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onTap?.()}
        className={cn('relative select-none', surface)}
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? 'none' : 'transform 220ms cubic-bezier(.2,.8,.2,1)',
          touchAction: 'pan-y',
        }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, base: x, dir: null }
          pressTimer.current = window.setTimeout(() => setPressed(true), 70)
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (!s.dir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            s.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
            release()
            if (s.dir === 'h') {
              e.currentTarget.setPointerCapture(e.pointerId)
              setDragging(true)
            }
          }
          if (s.dir === 'h') setX(Math.max(OPEN - 20, Math.min(0, s.base + dx)))
        }}
        onPointerUp={() => {
          const s = start.current
          start.current = null
          setDragging(false)
          release()
          if (!s) return
          if (s.dir === 'h') setX(x < OPEN / 2 ? OPEN : 0)
          else if (!s.dir) {
            if (x !== 0) setX(0)
            else onTap?.()
          }
        }}
        onPointerCancel={() => {
          start.current = null
          setDragging(false)
          release()
          setX(0)
        }}
      >
        {children}
      </div>
    </div>
  )
}
