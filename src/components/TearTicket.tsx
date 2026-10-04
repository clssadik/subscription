import { ScissorsIcon } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

// Abonelik detayındaki ödeme fişi. Kesik çizginin altındaki koçan soldan sağa doğru kesilir (sağa çekilir):
// kesilen sol uç, hâlâ bağlı olan sağ uçtan sarkar (dönme noktası koçanın sağ üst köşesi). Yeterince kesip bırakınca
// kesik sona kadar tamamlanır: önce sol taraf iyice düşer, sonra sağ uç da kopar ve koçan yerçekimiyle hızlanarak
// dönerek düşer; ardından onTear çalışır (ödendi işaretlenir). Yarıda bırakınca kâğıt gibi hafifçe sekerek yerine oturur.
// canTear değilse koçan sabittir.

/** Bu orandan fazla kesilip bırakılırsa kopar */
const TEAR_AT = 0.38
/** Eşiğe kadar sol ucun sarkma açısı (derece); eşikten sonra biraz daha sarkar */
const DROOP = 12
const FALL_MS = 950

// Özelliği tanıtma: ilk kez görünce koçan kendiliğinden biraz sarkıp geri gelir ve altında tek cümlelik bir açıklama çıkar.
// "Tamam"a basınca ya da ilk kez koparınca bir daha gösterilmez.
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

/** Kesilen oran (0-1) → sol ucun sarkma açısı (sağ üst köşe etrafında; eksi = sol aşağı) */
const droopAngle = (p: number) => -(Math.min(1, p / TEAR_AT) * DROOP + Math.max(0, p - TEAR_AT) * 18)

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
  const stubRef = useRef<HTMLDivElement>(null)
  const [dx, setDx] = useState(0)
  const [width, setWidth] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [falling, setFalling] = useState(false)
  // Koptuktan sonra yeni koçan (sonraki dönem) yerinde görünmez başlar ve yumuşakça belirir
  const [entering, setEntering] = useState(false)
  const [tip, setTip] = useState(() => !tipSeen())
  const showTip = tip && canTear
  const start = useRef<{ x: number; y: number; dir: 'h' | 'v' | null } | null>(null)
  const passed = useRef(false)

  const progress = Math.min(1, dx / width)
  const angle = droopAngle(progress)

  const closeTip = () => {
    markTipSeen()
    setTip(false)
  }

  function tear() {
    const el = stubRef.current
    if (!el || falling) return
    haptic()
    closeTip()
    setFalling(true)
    const from = `rotate(${angle}deg)`
    // 1) Kesik sona kadar biter, sol taraf iyice düşer  2) sağ uç kopar  3) yerçekimiyle hızlanarak, dönerek düşer
    const fall = el.animate(
      [
        { transform: from, opacity: 1, offset: 0, easing: 'cubic-bezier(0.4, 0, 0.6, 1)' },
        { transform: 'rotate(-34deg)', opacity: 1, offset: 0.26, easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
        { transform: 'translate(-4px, 14px) rotate(-38deg)', opacity: 1, offset: 0.38, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' },
        { transform: 'translate(-26px, 380px) rotate(-64deg)', opacity: 1, offset: 0.86, easing: 'linear' },
        { transform: 'translate(-34px, 520px) rotate(-72deg)', opacity: 0, offset: 1 },
      ],
      { duration: FALL_MS, fill: 'forwards' },
    )
    fall.onfinish = () => {
      onTear()
      // Yeni koçan: geçişsiz yerine konur, görünmez başlar, bir kare sonra belirir
      setDragging(true)
      setEntering(true)
      setDx(0)
      fall.cancel()
      setFalling(false)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setDragging(false)
          setEntering(false)
        }),
      )
    }
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

      {/* Koçan: sağ üst köşesinden asılı gibi döner */}
      <div
        ref={stubRef}
        role={canTear ? 'button' : undefined}
        tabIndex={canTear ? 0 : undefined}
        aria-label={canTear ? hint : undefined}
        onKeyDown={(e) => canTear && (e.key === 'Enter' || e.key === ' ') && tear()}
        className={cn(
          'relative z-10 origin-top-right rounded-b-[22px] bg-hero px-4 pt-3 pb-3.5 text-hero-fg select-none',
          canTear && 'cursor-grab',
          showTip && !dragging && !dx && !falling && 'tear-demo',
        )}
        style={{
          transform: `rotate(${angle}deg)`,
          opacity: entering ? 0 : 1,
          // Bırakınca kâğıt gibi hafifçe sekerek yerine oturur
          transition: dragging ? 'none' : 'transform 520ms cubic-bezier(0.34, 1.5, 0.64, 1), opacity 300ms ease',
          touchAction: 'pan-y',
        }}
        onPointerDown={(e) => {
          if (!canTear || falling) return
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
        <div className="mt-2 flex items-center gap-3 rounded-[18px] bg-surface py-2.5 pr-2.5 pl-3.5 text-sm animate-in fade-in slide-in-from-top-1 duration-300">
          <ScissorsIcon className="size-[18px] shrink-0 -rotate-90 text-bh-blue" />
          <p className="flex-1 leading-snug">Ödemeyi işaretlemek için koçanı sağa çekerek koparın.</p>
          <button type="button" onClick={closeTip} className="shrink-0 rounded-full bg-page px-3 py-1.5 text-[13px] font-medium">
            Tamam
          </button>
        </div>
      )}
    </section>
  )
}
