import { useEffect, useRef, useState, type ReactNode } from 'react'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

/** Dolma süresi (ms) */
const HOLD = 800
/** Klavyeyle basılı tutmanın kimliği (parmak kimlikleri pozitif) */
const KEYBOARD = -1

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
  // Basılı tutan parmak (ya da tuş): aynı anda ikinci parmak yok sayılır
  const active = useRef<number | null>(null)
  // Klavye basılıyken işaretli: tarayıcının o basıştan ürettiği tıklama onay sayılmasın
  const typing = useRef(false)

  // Ekran kapanınca bekleyen zamanlayıcılar durur: yarıda kalan basılı tutma onConfirm'i çağırmaz
  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(hintTimer.current)
    },
    [],
  )
  // Uygulama arka plana geçince ya da pencere odağını kaybedince bırakılış gelmeyebilir: basılı tutma iptal edilir
  useEffect(() => {
    const cancel = () => {
      typing.current = false
      if (active.current === null) return
      active.current = null
      window.clearTimeout(timer.current)
      setHolding(false)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Ana parmak (ya da tuş), bırakılması kaçmış eski basışın yerini alır ve sayaç baştan başlar; ikinci parmak yok sayılır
  const begin = (id: number, primary: boolean) => {
    if (active.current !== null && active.current !== id && !primary) return false
    active.current = id
    startedAt.current = performance.now()
    window.clearTimeout(timer.current)
    setHolding(true)
    timer.current = window.setTimeout(() => {
      active.current = null
      setHolding(false)
      onConfirm()
    }, HOLD)
    return true
  }
  const end = (id: number) => {
    if (active.current !== id) return
    active.current = null
    const short = performance.now() - startedAt.current < 250
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
      onPointerDown={(e) => {
        if (!begin(e.pointerId, e.isPrimary)) return
        // Basılı tutan parmak düğmeye yakalanır: dışarı çıksa da bırakılışı bu düğmeye gelir
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // parmak zaten kalkmışsa yakalanamaz; bırakılış yine onPointerUp ile gelir
        }
      }}
      onPointerUp={(e) => end(e.pointerId)}
      onPointerLeave={(e) => end(e.pointerId)}
      onPointerCancel={(e) => end(e.pointerId)}
      // Yakalama kalkınca (bırakılış ya da iptal) basılı tutma biter
      onLostPointerCapture={(e) => end(e.pointerId)}
      onContextMenu={(e) => e.preventDefault()}
      // Klavyeyle: Enter basılı tutulunca da aynı
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        typing.current = true
        if (!e.repeat) begin(KEYBOARD, true)
      }}
      onKeyUp={() => {
        end(KEYBOARD)
        // Boşluk tıklaması bırakılınca, Enter tıklaması basınca gelir: bayrak ancak ondan sonra iner
        window.setTimeout(() => {
          typing.current = false
        })
      }}
      // Ekran okuyucuyla etkinleştirme tıklama olarak gelir (detail 0). Parmakla dokunuş ve klavye tıklaması onay sayılmaz.
      onClick={(e) => {
        if (e.detail === 0 && !typing.current) onConfirm()
      }}
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
