import { useState } from 'react'
import { toast } from 'sonner'
import { FLOWER_URL } from '@/components/Brand'
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
 * desteklenmiyorsa (ör. Safari'de) hiç görünmez. Açılış ekranının devamı gibi: siyah zeminde çiçek, altta panel.
 */
export function PermissionGate() {
  const { state, enable } = usePush()
  const [open, setOpen] = useState(() => !asked())
  const [busy, setBusy] = useState(false)
  if (!open || state !== 'default') return null

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
    <div className="app-screen z-40 mx-auto flex max-w-md flex-col bg-black text-[#F2F2F2]">
      <div className="flex min-h-0 flex-1 items-center justify-center pt-[var(--top-gap)]">
        <img src={FLOWER_URL} alt="" width={140} height={140} className="size-[140px]" />
      </div>
      <section className="rounded-t-[28px] bg-surface px-5 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-ink">
        <h1 className="text-[19px] font-semibold">Bildirimler</h1>
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
