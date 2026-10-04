import { ScissorsIcon } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

// Abonelik detayındaki ödeme fişi. Kesik çizginin altındaki koçan sağa çekilerek koparılır: yeterince çekip bırakınca
// koçan uçar ve onTear çalışır (ödendi işaretlenir). Yarıda bırakınca yerine oturur. canTear değilse koçan sabittir.

/** Bu orandan fazla çekilip bırakılırsa kopar */
const TEAR_AT = 0.38
const FLY_MS = 380

// Özelliği tanıtma: ilk kez görünce koçan kendiliğinden biraz kayıp geri gelir ve altında kısa bir açıklama çıkar.
// "Anladım"a basınca ya da ilk kez koparınca bir daha gösterilmez.
const TIP_KEY = 'subly:tear-tip-seen'
const tipSeen = () => {
  try {
    return localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return true
  }
}
const markTipSeen = () => {
  try {
    localStorage.setItem(TIP_KEY, '1')
  } catch {
    // depolama kapalıysa bir dahaki sefere yine gösterilir
  }
}

export function TearTicket({
  top,
  stub,
  canTear,
  hint,
  onTear,
}: {
  top: ReactNode
  stub: ReactNode
  canTear: boolean
  /** Koçanda görünen ipucu, ör. "Kesip ödendi işaretle" */
  hint: string
  onTear: () => void
}) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flying, setFlying] = useState(false)
  // Koptuktan sonra yeni koçan görünmezden belirir (geri kayarak gelmesin)
  const [entering, setEntering] = useState(false)
  const [tip, setTip] = useState(() => !tipSeen())
  const showTip = tip && canTear
  const closeTip = () => {
    markTipSeen()
    setTip(false)
  }
  const start = useRef<{ x: number; y: number; dir: 'h' | 'v' | null } | null>(null)
  const [width, setWidth] = useState(1)
  const passed = useRef(false)

  const progress = Math.min(1, dx / width)

  function tear() {
    haptic()
    closeTip()
    setFlying(true)
    window.setTimeout(() => {
      onTear()
      // Yeni koçan (sonraki dönem) yerinde, görünmez başlar; bir kare sonra yumuşakça belirir
      setDragging(true)
      setEntering(true)
      setFlying(false)
      setDx(0)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setDragging(false)
          setEntering(false)
        }),
      )
    }, FLY_MS)
  }

  return (
    // Yana taşan koçan kırpılır: sayfa yana kaymasın (çentiklerin dışarı taşan yarıları da kesilir)
    <section className="relative overflow-x-clip">
      {/* Gövde: alt köşelerde zemin renginde yarım daireler (fişin çentikleri; diğer yarıları koçanda) */}
      <div className="relative overflow-hidden rounded-t-[22px] bg-hero px-4 pt-4 pb-3 text-hero-fg">
        {top}
        <span aria-hidden className="absolute -bottom-3 -left-3 size-6 rounded-full bg-page" />
        <span aria-hidden className="absolute -right-3 -bottom-3 size-6 rounded-full bg-page" />
      </div>

      {/* Koçan */}
      <div
        role={canTear ? 'button' : undefined}
        tabIndex={canTear ? 0 : undefined}
        aria-label={canTear ? hint : undefined}
        onKeyDown={(e) => canTear && (e.key === 'Enter' || e.key === ' ') && tear()}
        className={cn('relative origin-top-left rounded-b-[22px] bg-hero px-4 pt-3 pb-3.5 text-hero-fg select-none', canTear && 'cursor-grab', showTip && !dragging && !dx && 'tear-demo')}
        style={{
          transform: flying
            ? 'translate(115%, 40px) rotate(14deg)'
            : `translateX(${dx}px) rotate(${progress * 7}deg)`,
          opacity: flying || entering ? 0 : 1,
          transition: dragging ? 'none' : `transform ${FLY_MS}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${FLY_MS}ms ease`,
          touchAction: 'pan-y',
        }}
        onPointerDown={(e) => {
          if (!canTear || flying) return
          setWidth(e.currentTarget.offsetWidth)
          start.current = { x: e.clientX, y: e.clientY, dir: null }
          passed.current = false
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s) return
          const mx = e.clientX - s.x
          const my = e.clientY - s.y
          if (!s.dir && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
            s.dir = Math.abs(mx) > Math.abs(my) ? 'h' : 'v'
            if (s.dir === 'h') {
              e.currentTarget.setPointerCapture(e.pointerId)
              setDragging(true)
            }
          }
          if (s.dir !== 'h') return
          const next = Math.max(0, mx)
          setDx(next)
          // Kopma eşiği geçilince (ve geri dönülünce) hafif titreşim
          const over = next / width > TEAR_AT
          if (over !== passed.current) {
            passed.current = over
            haptic()
          }
        }}
        onPointerUp={() => {
          const s = start.current
          start.current = null
          setDragging(false)
          if (s?.dir === 'h' && dx / width > TEAR_AT) tear()
          else setDx(0)
        }}
        onPointerCancel={() => {
          start.current = null
          setDragging(false)
          setDx(0)
        }}
      >
        {/* Çentiklerin alt yarıları (yarım daire): koçan koparken onunla gider */}
        <span aria-hidden className="absolute top-0 -left-3 h-3 w-6 rounded-b-full bg-page" />
        <span aria-hidden className="absolute top-0 -right-3 h-3 w-6 rounded-b-full bg-page" />
        {/* Kesik çizgi; koparılabiliyorsa solunda makas */}
        <div aria-hidden className="-mt-3 mb-3 flex h-0 items-center">
          {canTear && <ScissorsIcon className="tear-hint mr-1.5 -ml-1 size-4 shrink-0 -rotate-90 opacity-70" />}
          <span className="flex-1 border-t border-dashed border-current opacity-25" />
        </div>
        {stub}
        {canTear && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium opacity-90">
            <span>{hint}</span>
            <span className="tear-hint" aria-hidden>→</span>
          </p>
        )}
      </div>

      {showTip && (
        <div className="mt-2 flex items-start gap-3 rounded-[18px] bg-surface p-3.5 text-sm animate-in fade-in slide-in-from-top-1 duration-300">
          <ScissorsIcon className="mt-0.5 size-[18px] shrink-0 -rotate-90 text-bh-blue" />
          <p className="flex-1 leading-snug">
            <span className="font-medium">Ödedin mi? Fişi kes.</span> Kesik çizginin altındaki kısmı sağa çekip kopar; ödeme “ödendi” olarak
            işaretlenir. Yanlışlıkla olursa “Geri al”a bas.
          </p>
          <button type="button" onClick={closeTip} className="-mt-0.5 shrink-0 rounded-full bg-page px-3 py-1.5 text-[13px] font-medium">
            Anladım
          </button>
        </div>
      )}
    </section>
  )
}
