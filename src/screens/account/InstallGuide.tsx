import { CheckIcon, PlusSquareIcon, ShareIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { SubPageHeader } from '@/components/SettingsList'
import { isInstalled } from '@/lib/install'

/** iPhone'da Safari'den "Ana Ekrana Ekle" adımları */
export function InstallGuide({ onBack }: { onBack: () => void }) {
  const installed = isInstalled()
  return (
    <>
      <SubPageHeader title="Ana ekrana ekle" onBack={onBack} />

      {installed ? (
        <div className="mt-6 flex flex-col items-center rounded-[22px] bg-surface px-6 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-bh-green/15 text-bh-green">
            <CheckIcon className="size-6" strokeWidth={2.4} />
          </span>
          <p className="mt-3 font-medium">Subly ana ekranında</p>
          <p className="mt-1 text-sm text-subtle">Uygulama gibi tam ekran açılıyor. Bir şey yapmana gerek yok.</p>
        </div>
      ) : (
        <>
          <p className="mt-3 px-1 text-[15px] text-subtle">
            Subly'yi ana ekrana eklersen uygulama gibi tam ekran açılır, adres çubuğu görünmez.
          </p>
          <ol className="mt-4 grid gap-2">
            <Step n={1} icon={<ShareIcon className="size-5 text-bh-blue" />}>
              Safari'de alttaki <b className="font-medium">Paylaş</b> düğmesine bas.
            </Step>
            <Step n={2} icon={<PlusSquareIcon className="size-5" />}>
              Listeyi kaydırıp <b className="font-medium">Ana Ekrana Ekle</b>'ye bas.
            </Step>
            <Step n={3} icon={<span className="font-medium text-bh-blue">Ekle</span>}>
              Sağ üstteki <b className="font-medium">Ekle</b>'ye bas. Subly simgesi ana ekranına gelir.
            </Step>
          </ol>
          <p className="mt-4 px-1 text-[12px] text-subtle">Bu adımlar Safari içindir. Başka bir tarayıcıdaysan sayfayı önce Safari'de aç.</p>
        </>
      )}
    </>
  )
}

function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-[18px] bg-surface p-3.5">
      <span className="num num-bold flex size-8 shrink-0 items-center justify-center rounded-full bg-bh-yellow text-[#141414]">{n}</span>
      <span className="min-w-0 flex-1 text-[15px]">{children}</span>
      <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-page px-2">{icon}</span>
    </li>
  )
}
