import { Trash2Icon, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { HOLD_MS } from '@/lib/useLongPress'
import { cn } from '@/lib/utils'

/** Yuvarlak düğmenin çapı ve satırla arası: satır bu kadar sola kayınca düğme tam görünür */
const BUTTON = 48
const OPEN = -(BUTTON + 2 * 12)
/** Bırakınca açık kalması için en az bu kadar çekilmeli (açık mesafesinin oranı); az çekiş geri kapanır */
const OPEN_AT = 0.65
/** Bırakınca açılma/kapanma süresi (ms): acele etmeden yerine otursun */
const SETTLE_MS = 520
/** Açık mesafeden sonrası hafif dirençli */
const resist = (x: number) => (x >= OPEN ? x : OPEN + (x - OPEN) * 0.8)
/** Satır genişliğinin bu oranından fazla çekilince bırakmak doğrudan siler (iOS'taki tam kaydırma) */
const FULL_AT = 0.5
/** iOS'taki gibi yay: düğme açılırken hafifçe büyüyüp yerine oturur */
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

/**
 * Sola kaydırınca sağında yuvarlak kırmızı "Sil" (ya da actionLabel) düğmesi çıkan satır (iOS Mesajlar gibi).
 * Düğme satır kaydıkça küçükten büyüyüp belirir. Basınca satır sola kayıp kapanır, sonra onDelete çalışır.
 * Satır yarısından fazla çekilip bırakılırsa düğmeye basmadan silinir. Dokununca onTap çalışır.
 */
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
  // Silinirken: satır sola kayıp çıkar, ardından yüksekliği kapanır
  const [removing, setRemoving] = useState<null | 'slide' | 'collapse'>(null)
  // Silme sürerken düğmeye yeniden basılırsa onDelete ikinci kez çalışmasın (durum güncellenmeden de geçerli)
  const busy = useRef(false)
  const box = useRef<HTMLDivElement>(null)
  const reveal = Math.min(1, Math.max(0, x / OPEN))
  // Tam kaydırma: eşik geçilince düğme uzayıp simgesi satırın yanına gelir, hafif titreşim olur; bırakınca silinir
  const [full, setFull] = useState(false)
  // Düğme satırla sayfa kenarı arasındaki boşluğu doldurana kadar uzar (yuvarlak → hap)
  const pill = Math.max(BUTTON, -x - 24)
  function remove() {
    if (busy.current) return
    busy.current = true
    haptic()
    setRemoving('slide')
    window.setTimeout(() => {
      const el = box.current
      if (el) el.style.height = `${el.offsetHeight}px`
      requestAnimationFrame(() => setRemoving('collapse'))
      window.setTimeout(() => {
        onDelete()
        // Satır listeden kalkmadıysa (ör. silme geri alındıysa aynı satır kalır) eski hâline döner
        window.setTimeout(() => {
          if (box.current) box.current.style.height = ''
          setRemoving(null)
          setFull(false)
          setX(0)
          busy.current = false
        }, 400)
      }, 260)
    }, 240)
  }
  // Satırı tutan tek parmak (id): başka parmaklar yok sayılır
  const start = useRef<{ x: number; y: number; base: number; dir: 'h' | 'v' | null; id: number } | null>(null)
  // Basılı tutunca satır hafifçe küçülür. Kısa gecikme: kaydırmaya başlayan parmak satırı küçültmesin.
  const [pressed, setPressed] = useState(false)
  const pressTimer = useRef(0)
  // Basılı tutunca (kaydırmadan) onTap çalışır: sayfası açılır. Ardından gelen bırakma tekrar açmaz.
  const holdTimer = useRef(0)
  const held = useRef(false)
  const release = () => {
    clearTimeout(pressTimer.current)
    clearTimeout(holdTimer.current)
    setPressed(false)
  }
  // Satır sayfadan kalkınca bekleyen basılı tutma zamanlayıcıları çalışmasın (kalkmış satırın onTap'i açılmasın)
  useEffect(
    () => () => {
      clearTimeout(pressTimer.current)
      clearTimeout(holdTimer.current)
    },
    [],
  )

  return (
    // Satırın kendi yatay kaydırması var: sayfanın sağa çekerek geri dönüşü burada çalışmaz
    <div
      ref={box}
      data-no-swipe-back
      // Kesilmez: sola kayan satır sayfa kenarına kadar gider (iOS gibi); sadece kapanırken kırpılır
      className={cn('relative transition-transform duration-100', pressed && 'scale-[0.98]', className)}
      style={
        removing === 'collapse'
          ? { height: 0, opacity: 0, overflow: 'hidden', transition: `height 260ms ${EASE}, opacity 200ms ease` }
          : undefined
      }
    >
      <button
        onClick={remove}
        aria-label={actionLabel}
        tabIndex={x === 0 ? -1 : 0}
        // Kaydırılmadıkça gizli
        style={{
          visibility: x === 0 && !dragging && !removing ? 'hidden' : 'visible',
          // Silinirken düğme artık dokunmaya cevap vermesin (görünmez ama üstünden dokunulabiliyordu)
          pointerEvents: removing ? 'none' : undefined,
          width: pill,
          height: BUTTON,
          paddingLeft: full ? 13 : 0,
          justifyContent: full ? 'flex-start' : 'center',
          opacity: removing ? 0 : reveal,
          transform: `translateY(-50%) scale(${removing ? (full ? 1 : 0.4) : 0.4 + 0.6 * reveal})`,
          transition: dragging
            ? 'padding 200ms ease'
            : `transform ${SETTLE_MS}ms ${SPRING}, width ${SETTLE_MS}ms ${EASE}, opacity 300ms ease`,
        }}
        className="absolute top-1/2 right-3 flex items-center rounded-full bg-bh-red text-white active:brightness-90"
      >
        <ActionIcon className="size-[22px]" strokeWidth={2} />
      </button>
      <div
        // Açılabilen satır düğmedir. onTap yoksa düz içerik: klavye odağı almaz, tuşla bir şey yapmaz
        role={onTap ? 'button' : undefined}
        tabIndex={onTap ? 0 : undefined}
        onKeyDown={
          onTap
            ? (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                // Boşluk sayfayı kaydırmasın
                e.preventDefault()
                onTap?.()
              }
            : undefined
        }
        className={cn('relative select-none rounded-[18px]', surface)}
        style={{
          transform: removing ? 'translateX(-110%)' : `translateX(${x}px)`,
          transition: dragging ? 'none' : `transform ${removing ? 240 : SETTLE_MS}ms ${EASE}`,
          touchAction: 'pan-y',
        }}
        onPointerDown={(e) => {
          // İkinci parmak ilk parmak bitene kadar yok sayılır (zamanlayıcıları ezip yetim bırakmasın). Ana parmak ise
          // önceki parmağın bırakılması kaçmışsa bile yeni basış sayılır: hiçbir parmak yokken ana parmak gelir.
          if (start.current && start.current.id !== e.pointerId && !e.isPrimary) return
          clearTimeout(pressTimer.current)
          clearTimeout(holdTimer.current)
          start.current = { x: e.clientX, y: e.clientY, base: x, dir: null, id: e.pointerId }
          pressTimer.current = window.setTimeout(() => setPressed(true), 70)
          held.current = false
          if (onTap && x === 0)
            holdTimer.current = window.setTimeout(() => {
              held.current = true
              setPressed(false)
              haptic()
              onTap()
            }, HOLD_MS)
        }}
        onPointerMove={(e) => {
          const s = start.current
          if (!s || e.pointerId !== s.id) return
          const dx = e.clientX - s.x
          const dy = e.clientY - s.y
          if (!s.dir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            s.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
            release()
            if (s.dir === 'h') {
              try {
                e.currentTarget.setPointerCapture(e.pointerId)
              } catch {
                // parmak zaten kalkmışsa yakalanamaz; hareket yine izlenir
              }
              setDragging(true)
            }
          }
          if (s.dir === 'h') {
            const next = resist(Math.min(0, s.base + dx))
            setX(next)
            const isFull = next < -(box.current?.offsetWidth ?? 300) * FULL_AT
            if (isFull !== full) {
              if (isFull) haptic()
              setFull(isFull)
            }
          }
        }}
        onPointerUp={(e) => {
          const s = start.current
          // Başka parmağın bırakılması bu satırın basışını bitirmesin
          if (s && e.pointerId !== s.id) return
          start.current = null
          setDragging(false)
          release()
          if (!s) return
          if (s.dir === 'h') {
            if (full) return remove()
            const open = x < OPEN * OPEN_AT
            // "Sil" açılınca hafif titreşim
            if (open && s.base === 0) haptic()
            setX(open ? OPEN : 0)
          }
          else if (!s.dir) {
            if (x !== 0) setX(0)
            else if (!held.current) onTap?.()
          }
        }}
        onPointerCancel={(e) => {
          const s = start.current
          if (s && e.pointerId !== s.id) return
          start.current = null
          setDragging(false)
          setFull(false)
          release()
          setX(0)
        }}
      >
        {children}
      </div>
      {/* Kaydırmadan da silinsin: ekran okuyucu ve klavye için görünmez düğme. Satır kapalıyken; açılınca yukarıdaki düğme görünür */}
      {x === 0 && (
        <button type="button" onClick={remove} className="sr-only">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
