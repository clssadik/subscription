import { ScissorsIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

// Abonelik detayındaki ödeme fişi. Kesik çizginin altındaki koçan soldan sağa doğru kesilir (parmak sağa çekilir).
// Kâğıt hissi: koçan tek parça ama ince bir kâğıt gibi hareket eder. Kesildikçe sol ucu, hâlâ bağlı olan sağ üst köşeden
// hafifçe sarkar ve öne (kullanıcıya doğru) kalkar (3B), altına yumuşak gölge düşer; kopan kenar delikli/tırtıklı görünür.
// Yeterince kesip bırakınca koçan kopar, dönerek ve öne devrilerek düşer; ardından onTear çalışır (ödendi işaretlenir).
// Yarıda bırakınca yerine oturur. canTear değilse sabittir.

/** Bu orana kadar kesilince parmak kaldırılmadan kendiliğinden kopar (geri alınamaz) */
const TEAR_AT = 0.5
const FALL_MS = 900
/** Düşüşün bu anında "Ödendi" ekranı açılır; koçan yerine, ekran onu tamamen örttükten sonra konur */
const PAID_AT = 0.55

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

/** Kesilen oran (0-1) → koçanın duruşu: sağ üst köşeden hafif sarkma + sol ucun öne kalkması */
const pose = (p: number) => `rotate(${-p * 9}deg) rotateY(${-p * 26}deg) rotateX(${p * 14}deg)`

export function TearTicket({
  top,
  stub,
  canTear,
  hint,
  note,
  onTear,
  restore = 0,
}: {
  top: ReactNode
  stub: ReactNode
  canTear: boolean
  /** Koçanda görünen ipucu, ör. "Kesip ödendi işaretle" */
  hint: string
  /** Kesilemezken koçanda neden yazar, ör. "19 Şubat ödemesi o ay gelince kesilebilir" */
  note?: string
  onTear: () => void
  /** Her artışta (ödeme geri alınınca) koçan aşağıdan dönerek uçup fişe geri yapışır */
  restore?: number
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
  const tween = useRef(0)
  const progress = Math.min(1, cut / width)

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

  // Geri alınınca kopuşun yavaş çekim tersi: koçan düştüğü yoldan yavaşça yükselip sarkık hâliyle sağ köşesine asılır,
  // ardından kesik soldan sağa kapanarak yerine oturur (~1,5 sn). Ekran çizilmeden başlar: yerinde bir an görünmesin.
  useLayoutEffect(() => {
    const el = root.current
    if (!restore || !el) return
    const w = el.offsetWidth
    setWidth(w)
    setCut(w)
    const rise = el.animate(
      [
        { transform: 'translate(-30px, 360px) rotate(-26deg) rotateY(-40deg) rotateX(55deg)', opacity: 0 },
        { transform: `translate(-6px, 24px) ${pose(1)} rotate(-8deg)`, opacity: 1, offset: 0.7 },
        { transform: pose(1), opacity: 1 },
      ],
      { duration: 850, easing: 'cubic-bezier(0.15, 0.6, 0.3, 1)' },
    )
    rise.onfinish = () => animateCut(w, 0, 650)
    return () => rise.cancel()
  }, [restore])

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

  function tear(from = cut) {
    if (falling) return
    haptic()
    closeTip()
    setFalling(true)
    // Kesik sona kadar tamamlanır, sonra kopan kâğıt sallanarak süzülüp düşer
    animateCut(from, width, 160, () => {
      const el = root.current
      if (!el) return
      const fall = el.animate(
        [
          { transform: pose(1), opacity: 1 },
          { transform: `translate(-6px, 24px) ${pose(1)} rotate(-8deg)`, opacity: 1, offset: 0.25 },
          { transform: 'translate(-30px, 360px) rotate(-26deg) rotateY(-40deg) rotateX(55deg)', opacity: 0 },
        ],
        { duration: FALL_MS, easing: 'cubic-bezier(0.5, 0, 0.85, 0.4)', fill: 'forwards' },
      )
      const paid = window.setTimeout(onTear, FALL_MS * PAID_AT)
      fall.onfinish = () => {
        window.clearTimeout(paid)
        // Önce koçan görünmez yapılıp kesik kapatılır, sonra düşüş kaldırılır: yerinde birleşik hâliyle bir an bile görünmesin
        flushSync(() => {
          setEntering(true)
          setCut(0)
        })
        fall.cancel()
        setFalling(false)
        requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)))
      }
    })
  }

  // Kopan kenar: kesik noktasına kadar küçük yarım delikler (tırtık), sonrası düz. İki maske katmanı birleşir:
  // her yerde delikli desen + kesik noktasının sağında dolu alan (orada delikleri kapatır).
  const tornEdge = (edge: 'top' | 'bottom'): React.CSSProperties | undefined => {
    if (cut <= 0) return undefined
    const holes = `radial-gradient(circle at 5px ${edge === 'top' ? '0' : '100%'}, transparent 2.6px, #000 3.2px) 0 0 / 10px 100% repeat-x`
    const rest = `linear-gradient(to right, transparent ${cut}px, #000 ${cut}px)`
    const mask = `${holes}, ${rest}`
    return { WebkitMask: mask, mask }
  }

  // Koçanın görünümü
  const skin = (
    <div className="relative rounded-b-[22px] bg-hero px-4 pt-3 pb-3.5 text-hero-fg" style={tornEdge('top')}>
      {/* Çentiklerin alt yarıları */}
      <span aria-hidden className="absolute top-0 -left-3 h-3 w-6 rounded-b-full bg-page" />
      <span aria-hidden className="absolute top-0 -right-3 h-3 w-6 rounded-b-full bg-page" />
      {/* Kesik çizgi; koparılabiliyorsa solunda makas */}
      <div aria-hidden className="-mt-3 mb-3 flex h-0 items-center">
        {canTear && <ScissorsIcon className="tear-hint mr-1.5 -ml-1 size-4 shrink-0 -rotate-90 opacity-70" />}
        {/* Kesik çizgi SVG ile çizilir: iPhone 1px'lik "dashed" kenarlığı düz çizgi gibi, ince degrade çizgiyi hiç göstermiyor */}
        <svg aria-hidden className="h-0.5 flex-1 overflow-visible opacity-40">
          <line x1="0" y1="1" x2="100%" y2="1" stroke="currentColor" strokeWidth="1.25" strokeDasharray="6 5" />
        </svg>
      </div>
      {stub}
      {!canTear && note && <p className="mt-2.5 text-[12px] opacity-60">{note}</p>}
      {canTear && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium opacity-90">
          <span>{hint}</span>
          <span className="tear-hint" aria-hidden>→</span>
        </p>
      )}
    </div>
  )

  return (
    // Yana taşan koçan kırpılır: sayfa yana kaymasın (çentiklerin dışarı taşan yarıları da kesilir)
    <section className="relative overflow-x-clip [perspective:900px]">
      {/* Gövde: alt köşelerde zemin renginde yarım daireler (fişin çentikleri; diğer yarıları koçanda) */}
      <div className="relative overflow-hidden rounded-t-[22px] bg-hero px-4 pt-4 pb-3 text-hero-fg" style={tornEdge('bottom')}>
        {top}
        <span aria-hidden className="absolute -bottom-3 -left-3 size-6 rounded-full bg-page" />
        <span aria-hidden className="absolute -right-3 -bottom-3 size-6 rounded-full bg-page" />
      </div>

      {/* Koçan */}
      <div
        ref={root}
        // Sağa çekmek koçanı keser; sayfanın sağa çekerek geri dönüşü burada çalışmaz
        data-no-swipe-back
        role={canTear ? 'button' : undefined}
        tabIndex={canTear ? 0 : undefined}
        aria-label={canTear ? hint : undefined}
        onKeyDown={(e) => canTear && (e.key === 'Enter' || e.key === ' ') && tear()}
        // -mt-px: koçan gövdenin altına 1px biner. iPhone'da ikisinin arasında zemin renginde ince bir boşluk kalıp
        // kesik çizginin yerinde düz açık renkli bir çizgi gibi görünüyordu.
        className={cn('relative z-10 -mt-px origin-top-right select-none', canTear && 'cursor-grab')}
        style={{
          // Kesilmezken dönüşüm yok: iPhone dönen katmanın kenarını yumuşatıp yine ince bir çizgi bırakıyor
          transform: progress > 0 ? pose(progress) : undefined,
          // Kalktıkça altına gölge düşer
          filter: progress > 0 ? `drop-shadow(0 ${4 + progress * 14}px ${8 + progress * 18}px rgb(0 0 0 / ${0.15 + progress * 0.3}))` : undefined,
          opacity: entering ? 0 : 1,
          // Gizlenirken anında, belirirken yumuşak
          transition: entering ? 'none' : 'opacity 300ms ease',
          touchAction: 'pan-y',
        }}
        onPointerDown={(e) => {
          if (!canTear || falling) return
          cancelAnimationFrame(tween.current)
          setWidth(e.currentTarget.offsetWidth)
          start.current = { x: e.clientX, y: e.clientY, dir: null }
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
          // Eşiğe gelince hemen kopar: parmak daha fazla çekmeden ya da geri gelmeden
          if (next / width >= TEAR_AT) {
            start.current = null
            tear(next)
            return
          }
          setCut(next)
        }}
        onPointerUp={() => {
          const s = start.current
          start.current = null
          if (s && cut > 0) animateCut(cut, 0, 480)
        }}
        onPointerCancel={() => {
          const s = start.current
          start.current = null
          // Koparken (düşüş sırasında) gelen iptal kesiği kapatmasın
          if (s && cut > 0) animateCut(cut, 0, 480)
        }}
      >
        {skin}
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
