import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Ödeme işaretlenince kısa tam ekran onay (Apple Pay "Bitti" gibi): yeşil tik kendini çizer, altında "Ödendi" ve ayrıntı.
 * ~1,6 sn sonra kendiliğinden kapanır; dokununca hemen kapanır.
 */
export function PaidOverlay({ title, detail, onClose }: { title: string; detail: string; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 1600)
    return () => window.clearTimeout(t)
  }, [onClose])

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-page/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <svg viewBox="0 0 96 96" className="paid-pop size-28" aria-hidden>
        <circle cx="48" cy="48" r="44" className="fill-bh-green" />
        <path d="M30 49.5 L42.5 62 L67 36" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="paid-check" />
      </svg>
      <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-300 [animation-delay:150ms] [animation-fill-mode:both]">
        {/* Satır yüksekliği 1 olunca iPhone, kayarak gelen bu blokta Ö harfinin noktalarını kesiyor: biraz pay bırakılır */}
        <p className="num num-bold text-[34px] leading-[1.2]">Ödendi</p>
        <p className="mt-1 text-[15px] text-subtle">{title}</p>
        <p className="mt-0.5 text-[13px] text-subtle">{detail}</p>
      </div>
    </div>,
    document.body,
  )
}
