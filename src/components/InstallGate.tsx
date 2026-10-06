import { LOGO_URL, Wordmark } from '@/components/Brand'
import { isAndroid } from '@/lib/install'
import { InstallSteps } from '@/screens/account/InstallGuide'

/**
 * Telefonda tarayıcıdan açılınca ilk gelen tam ekran rehber: Monthwise'ı ana ekrana eklemeyi anlatır.
 * Açılış ekranının devamı gibi: siyah zeminde hayalet, adımlar alttaki panelde (Safari'nin Paylaş düğmesine yakın).
 * Ana ekrandan açılan uygulamada görünmez. "Safari'de devam et" bu oturum için geçer (src/lib/install.ts).
 */
export function InstallGate({ onContinue }: { onContinue: () => void }) {
  const android = isAndroid()
  return (
    <main className="app-screen mx-auto flex max-w-md flex-col bg-black text-[#F2F2F2]">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 pt-[var(--top-gap)]">
        <img src={LOGO_URL} alt="" width={240} height={240} className="size-[240px] shrink-0" />
        <Wordmark className="text-[24px]" />
      </div>

      <section className="rounded-t-[28px] bg-surface px-5 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-ink">
        <h1 className="text-[19px] font-semibold">Ana ekrana ekle</h1>
        <InstallSteps className="mt-3" />
        <button
          type="button"
          onClick={onContinue}
          className="mt-2 min-h-11 w-full text-sm text-subtle underline underline-offset-4"
        >
          {android ? 'Tarayıcıda' : "Safari'de"} devam et
        </button>
      </section>
    </main>
  )
}
