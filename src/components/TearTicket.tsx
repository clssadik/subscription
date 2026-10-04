import { ScissorsIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

// Abonelik detayındaki ödeme fişi. Kesik çizginin altındaki koçan soldan sağa doğru kesilir (parmak sağa çekilir).
// Kâğıt hissi: koçan görünmez ince dikey şeritlere bölünür; her şerit solundakini taşır ve kesik noktasının solundaki
// şeritler birer birer biraz daha döner. Böylece kesilen kısım menteşeden yumuşak bir kıvrımla aşağı bükülür, büküldükçe
// gölgelenir. Yeterince kesip bırakınca kesik sona kadar tamamlanır, koçan kopar ve kâğıt gibi sallanarak süzülüp düşer;
// ardından onTear çalışır (ödendi işaretlenir). Yarıda bırakınca kıvrım açılıp yerine oturur. canTear değilse sabittir.

/** Bu orandan fazla kesilip bırakılırsa kopar */
const TEAR_AT = 0.38
/** Şerit sayısı: arttıkça kıvrım yumuşar */
const STRIPS = 16
/** Kıvrımın uzunluğu (px): menteşeden bu kadar uzağa kadar bükülür, sonrası düz sarkar */
const BEND = 72
/** Tamamen kesilince sarkma açısı (derece) */
const MAX_DROOP = 80
const FALL_MS = 1500

// Özelliği tanıtma: ilk kez görünce koçan kendiliğinden biraz kesilip geri açılır ve altında tek cümlelik bir açıklama çıkar.
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

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Kesik noktası cut (px) iken k. eklemin (k. şeridin sağ kenarı) dönme açısı. Eklem kesik noktasının sağındaysa 0 (koçan bağlı).
 * Solundaysa menteşeye BEND px uzaklığa kadar her eklem toplam açının bir payını alır: yumuşak kıvrım, sonrası düz.
 */
function jointAngle(k: number, cut: number, width: number) {
  const x = ((k + 1) / STRIPS) * width
  if (x >= cut) return 0
  const total = Math.min(1, cut / (width * 0.55)) * MAX_DROOP
  const stripW = width / STRIPS
  return cut - x <= BEND ? -(total * stripW) / BEND : 0
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
  const root = useRef<HTMLDivElement>(null)
  const [cut, setCut] = useState(0)
  const [width, setWidth] = useState(1)
  const [falling, setFalling] = useState(false)
  // Koptuktan sonra yeni koçan (sonraki dönem) yerinde görünmez başlar ve yumuşakça belirir
  const [entering, setEntering] = useState(false)
  const [tip, setTip] = useState(() => !tipSeen())
  const showTip = tip && canTear
  const start = useRef<{ x: number; y: number; dir: 'h' | 'v' | null } | null>(null)
  const passed = useRef(false)
  const tween = useRef(0)

  // Kesik noktasını yumuşakça bir değere götürür (bırakınca açılma, koparken tamamlanma, tanıtım)
  function animateCut(from: number, to: number, ms: number, done?: () => void) {
    cancelAnimationFrame(tween.current)
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms)
      setCut(from + (to - from) * easeOut(t))
      if (t < 1) tween.current = requestAnimationFrame(step)
      else done?.()
    }
    tween.current = requestAnimationFrame(step)
  }

  // Tanıtım: ilk açılışta koçan iki kez biraz kesilip geri açılır
  useEffect(() => {
    if (!showTip || !root.current) return
    const w = root.current.offsetWidth
    setWidth(w)
    const timers = [700, 2100].map((delay) =>
      window.setTimeout(() => animateCut(0, w * 0.3, 520, () => window.setTimeout(() => animateCut(w * 0.3, 0, 620), 220)), delay),
    )
    return () => {
      timers.forEach(clearTimeout)
      cancelAnimationFrame(tween.current)
    }
  }, [showTip])

  const closeTip = () => {
    markTipSeen()
    setTip(false)
  }

  function tear() {
    if (falling) return
    haptic()
    closeTip()
    setFalling(true)
    // Kesik sona kadar tamamlanır, sonra kopan kâğıt sallanarak süzülüp düşer
    animateCut(cut, width, 220, () => {
      const el = root.current
      if (!el) return
      const fall = el.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          { transform: 'translate(-18px, 70px) rotate(-14deg)', opacity: 1, offset: 0.22 },
          { transform: 'translate(22px, 170px) rotate(9deg)', opacity: 1, offset: 0.45 },
          { transform: 'translate(-12px, 290px) rotate(-11deg)', opacity: 1, offset: 0.68 },
          { transform: 'translate(14px, 420px) rotate(6deg)', opacity: 0.9, offset: 0.86 },
          { transform: 'translate(0, 520px) rotate(-4deg)', opacity: 0 },
        ],
        { duration: FALL_MS, easing: 'cubic-bezier(0.45, 0, 0.75, 1)', fill: 'forwards' },
      )
      fall.onfinish = () => {
        onTear()
        setEntering(true)
        setCut(0)
        fall.cancel()
        setFalling(false)
        requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)))
      }
    })
  }

  // Koçanın görünümü (her şeritte aynısı çizilir, şerit kendi dilimini gösterir)
  const skin = (
    <div className="relative rounded-b-[22px] bg-hero px-4 pt-3 pb-3.5 text-hero-fg">
      {/* Çentiklerin alt yarıları */}
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
  )

  // Şerit zinciri: en sağdaki şerit sabit ve akışta (boyutu verir); her şerit solundakini taşır, o da kendi sağ kenarından döner
  function strip(k: number, angleSoFar: number): ReactNode {
    const left = (k / STRIPS) * 100
    const right = 100 - ((k + 1) / STRIPS) * 100
    const angle = k === STRIPS - 1 ? 0 : jointAngle(k, cut, width)
    const bent = angleSoFar + angle
    return (
      <div
        className={k === STRIPS - 1 ? 'relative' : 'absolute inset-0'}
        style={k === STRIPS - 1 ? undefined : { transform: `rotate(${angle}deg)`, transformOrigin: `${((k + 1) / STRIPS) * 100}% 0` }}
      >
        <div
          aria-hidden={k !== STRIPS - 1 || undefined}
          // Komşu şeritle 1px üst üste: aralarında çizgi görünmesin. Büküldükçe hafifçe gölgelenir.
          style={{
            clipPath: `inset(-40px calc(${right}% - 1px) -1px calc(${left}% - 1px))`,
            filter: bent ? `brightness(${1 - Math.min(0.35, Math.abs(bent) / 220)})` : undefined,
          }}
        >
          {skin}
        </div>
        {k > 0 && strip(k - 1, bent)}
      </div>
    )
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
        ref={root}
        role={canTear ? 'button' : undefined}
        tabIndex={canTear ? 0 : undefined}
        aria-label={canTear ? hint : undefined}
        onKeyDown={(e) => canTear && (e.key === 'Enter' || e.key === ' ') && tear()}
        className={cn('relative z-10 select-none', canTear && 'cursor-grab')}
        style={{ opacity: entering ? 0 : 1, transition: 'opacity 300ms ease', touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          if (!canTear || falling) return
          cancelAnimationFrame(tween.current)
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
            if (s.dir === 'h') e.currentTarget.setPointerCapture(e.pointerId)
          }
          if (s.dir !== 'h') return
          const next = Math.min(width, Math.max(0, mx))
          setCut(next)
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
          if (s?.dir === 'h' && cut / width > TEAR_AT) tear()
          else if (cut > 0) animateCut(cut, 0, 480)
        }}
        onPointerCancel={() => {
          start.current = null
          if (cut > 0) animateCut(cut, 0, 480)
        }}
      >
        {strip(STRIPS - 1, 0)}
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
