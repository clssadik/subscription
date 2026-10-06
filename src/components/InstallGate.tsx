import { EllipsisIcon, PlusSquareIcon, ShareIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { isAndroid } from '@/lib/install'

/**
 * Telefonda tarayıcıdan açılınca ilk gelen tam ekran rehber: Monthwise'ı ana ekrana eklemeyi anlatır.
 * Açılış ekranının devamı gibi: siyah zeminde çiçek, adımlar alttaki panelde (Safari'nin Paylaş düğmesine yakın).
 * Ana ekrandan açılan uygulamada görünmez. "Safari'de devam et" bu oturum için geçer (src/lib/install.ts).
 */
export function InstallGate({ onContinue }: { onContinue: () => void }) {
  const android = isAndroid()
  return (
    <main className="app-screen mx-auto flex max-w-md flex-col bg-black text-[#F2F2F2]">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 pt-[var(--top-gap)]">
        <img src="/logo-flower.webp" alt="" width={180} height={180} className="size-[180px] shrink-0" />
        <span lang="en" className="font-label pl-[0.24em] text-[24px] leading-none font-extralight tracking-[0.24em] uppercase">Monthwise</span>
      </div>

      <section className="rounded-t-[28px] bg-surface px-5 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-ink">
        <h1 className="text-[19px] font-semibold">Ana ekranına ekle</h1>
        {android ? (
          <ol className="mt-3 grid gap-1">
            <Step n={1} icon={<EllipsisIcon className="size-5 rotate-90" />}>
              Sağ üstteki menü
            </Step>
            <Step n={2} icon={<PlusSquareIcon className="size-5" />}>
              Ana ekrana ekle
            </Step>
            <Step n={3} icon={<span className="font-medium text-bh-blue">Ekle</span>}>
              Ekle ile onayla
            </Step>
          </ol>
        ) : (
          <ol className="mt-3 grid gap-1">
            <Step n={1} icon={<ShareIcon className="size-5 text-bh-blue" />}>
              Alttaki Paylaş <span className="text-subtle">(yoksa önce •••)</span>
            </Step>
            <Step n={2} icon={<PlusSquareIcon className="size-5" />}>
              Ana Ekrana Ekle
            </Step>
            <Step n={3} icon={<span className="font-medium text-bh-blue">Ekle</span>}>
              Sağ üstte Ekle
            </Step>
          </ol>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="mt-2 min-h-11 w-full text-sm text-subtle underline underline-offset-4"
        >
          Şimdilik {android ? 'tarayıcıda' : "Safari'de"} devam et
        </button>
      </section>
    </main>
  )
}

function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-h-10 items-center gap-3.5 text-[15px]">
      <span className="num num-bold w-3 shrink-0">{n}</span>
      <span className="min-w-0 flex-1">{children}</span>
      <span className="flex shrink-0 items-center">{icon}</span>
    </li>
  )
}
