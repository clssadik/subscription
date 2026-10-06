import { ArrowDownIcon } from 'lucide-react'
import logoUrl from '@/assets/subly-logo.png'
import { isAndroid } from '@/lib/install'
import { InstallSteps } from '@/screens/account/InstallGuide'

/**
 * Telefonda tarayıcıdan açılınca ilk gelen tam ekran rehber: Subly'yi ana ekrana eklemeyi anlatır.
 * Ana ekrandan açılan uygulamada görünmez. "Safari'de devam et" bu oturum için geçer (src/lib/install.ts).
 */
export function InstallGate({ onContinue }: { onContinue: () => void }) {
  const android = isAndroid()
  return (
    <main className="app-screen mx-auto flex max-w-md flex-col overflow-y-auto overscroll-contain bg-page px-4 pt-[var(--top-gap)] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <img src={logoUrl} alt="" width={52} height={52} className="mt-4 rounded-[13px]" />
      <h1 className="num num-bold mt-5 text-[30px] leading-[1.15]">Subly'yi ana ekranına ekle</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-subtle">
        Uygulama gibi tam ekran açılır, adres çubuğu görünmez. Girişin hatırlanır, bildirimler ancak böyle gelebilir.
      </p>

      <InstallSteps className="mt-6" />

      <button type="button" onClick={onContinue} className="mt-6 min-h-11 self-center px-4 text-sm text-subtle underline underline-offset-4">
        Şimdilik {android ? 'tarayıcıda' : "Safari'de"} devam et
      </button>

      {/* Safari'nin alt çubuğunu gösteren ok (Android'de menü üstte olduğu için yok) */}
      {!android && (
        <div aria-hidden className="mt-auto flex flex-col items-center pt-4 text-subtle">
          <span className="text-[12px]">Paylaş düğmesi aşağıda</span>
          <ArrowDownIcon className="install-nudge mt-1 size-6" strokeWidth={2} />
        </div>
      )}
    </main>
  )
}
