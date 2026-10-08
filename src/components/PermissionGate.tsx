import { useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { LOGO_URL } from '@/components/Brand'
import { haptic } from '@/lib/haptics'
import { usePush } from '@/lib/push'
import { transition } from '@/lib/transition'

// Bir kez sorulur: "Şimdi değil" denince de bir daha çıkmaz (Hesap → Bildirimler'den açılabilir)
const ASKED_KEY = 'monthwise:notify-asked'
const asked = () => {
  try {
    return localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    return true
  }
}
const markAsked = () => {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    // depolama kapalıysa bir dahaki açılışta yine sorulur
  }
}

/**
 * İlk girişte bildirim izni. iPhone izni sadece ana ekrandan açılan uygulamada ve bir dokunuşun içinde sorabiliyor;
 * bu yüzden kendiliğinden değil, "İzin ver" düğmesiyle istenir. İzin zaten verilmiş, reddedilmiş ya da
 * desteklenmiyorsa (ör. Safari'de) hiç görünmez. Açılış ekranının devamı gibi: siyah zeminde beyaz logo, altta panel.
 * covered: üstünde ad ekranı açıksa true; o kapanana kadar bu ekran dokunulmaz ve odaklanmaz.
 * onOpenChange: açık olup olmadığını App'e bildirir; arkadaki uygulama o sırada inert olur (src/App.tsx).
 */
export function PermissionGate({ covered, onOpenChange }: { covered: boolean; onOpenChange: (open: boolean) => void }) {
  const { state, enable } = usePush()
  const [open, setOpen] = useState(() => !asked())
  const [busy, setBusy] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const shown = open && state === 'default'

  useLayoutEffect(() => {
    onOpenChange(shown)
    return () => onOpenChange(false)
  }, [shown, onOpenChange])
  // Açılınca başlığa odaklanılır (ekran okuyucu ekranı okur). Üstteki ad ekranı kapanınca sıra buraya gelir.
  useLayoutEffect(() => {
    if (shown && !covered) title.current?.focus({ preventScroll: true })
  }, [shown, covered])

  if (!shown) return null

  const close = () => {
    markAsked()
    transition('fade', () => setOpen(false))
  }

  async function allow() {
    haptic()
    setBusy(true)
    try {
      await enable()
    } catch {
      toast.error('Bildirim izni kaydedilemedi. Hesap → Bildirimler’den tekrar deneyin.')
    }
    setBusy(false)
    close()
  }

  return (
    <div inert={covered} className="app-screen z-40 mx-auto flex max-w-md flex-col bg-black text-[#F2F2F2]">
      <div className="flex min-h-0 flex-1 items-center justify-center pt-[var(--top-gap)]">
        <img src={LOGO_URL} alt="" width={155} height={155} className="size-[155px]" />
      </div>
      <section className="rounded-t-[28px] bg-surface px-5 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-ink">
        {/* Odak hedefi (düğme değil): genel odak çizgisi çıkmasın */}
        <h1 ref={title} tabIndex={-1} style={{ outline: 'none' }} className="text-[19px] font-semibold">Bildirimler</h1>
        <p className="mt-1.5 text-[15px] text-subtle">Yenilenmeden ve son ödemeden önce bildirim gelir.</p>
        <button
          type="button"
          onClick={allow}
          disabled={busy}
          className="pressable mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-bh-yellow font-label text-base font-semibold text-[#141414] disabled:opacity-60"
        >
          İzin ver
        </button>
        <button type="button" onClick={close} className="mt-1 min-h-11 w-full text-sm text-subtle">
          Şimdi değil
        </button>
      </section>
    </div>
  )
}
