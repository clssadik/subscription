import { CheckIcon, EllipsisIcon, PlusSquareIcon, ShareIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { SubPageHeader } from '@/components/SettingsList'
import { isAndroid, isInstalled } from '@/lib/install'
import { cn } from '@/lib/utils'

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
          <p className="mt-3 font-medium">Monthwise ana ekranında</p>
          <p className="mt-1 text-sm text-subtle">Uygulama gibi tam ekran açılıyor. Bir şey yapmana gerek yok.</p>
        </div>
      ) : (
        <>
          <p className="mt-3 px-1 text-[15px] text-subtle">
            Monthwise'ı ana ekrana eklersen uygulama gibi tam ekran açılır, adres çubuğu görünmez.
          </p>
          <InstallSteps className="mt-4" />
        </>
      )}
    </>
  )
}

/** Ana ekrana ekleme adımları (Hesap → Ana ekrana ekle ve açılıştaki rehber). Android'de tarayıcı menüsü adımları. */
export function InstallSteps({ className }: { className?: string }) {
  if (isAndroid())
    return (
      <ol className={cn('grid gap-2', className)}>
        <Step n={1} icon={<EllipsisIcon className="size-5 rotate-90" />}>
          Tarayıcının sağ üstündeki <b className="font-medium">⋮</b> menüsüne bas.
        </Step>
        <Step n={2} icon={<PlusSquareIcon className="size-5" />}>
          <b className="font-medium">Ana ekrana ekle</b> ya da <b className="font-medium">Uygulamayı yükle</b>'ye bas.
        </Step>
        <Step n={3} icon={<span className="font-medium text-bh-blue">Ekle</span>}>
          <b className="font-medium">Ekle</b> ile onayla. Monthwise simgesi ana ekranına gelir.
        </Step>
      </ol>
    )
  return (
    <ol className={cn('grid gap-2', className)}>
      <Step n={1} icon={<ShareIcon className="size-5 text-bh-blue" />}>
        Safari'de alttaki <b className="font-medium">Paylaş</b> düğmesine bas. Görmüyorsan önce sağ alttaki <b className="font-medium">•••</b>'ye bas.
      </Step>
      <Step n={2} icon={<PlusSquareIcon className="size-5" />}>
        Listede <b className="font-medium">Ana Ekrana Ekle</b>'yi bul. Görünmüyorsa <b className="font-medium">Daha Fazla</b>'ya bas.
      </Step>
      <Step n={3} icon={<span className="font-medium text-bh-blue">Ekle</span>}>
        Sağ üstteki <b className="font-medium">Ekle</b>'ye bas. Monthwise'ı bundan sonra ana ekrandaki simgesinden aç.
      </Step>
    </ol>
  )
}

function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-[18px] bg-surface p-3.5">
      <span className="num num-bold flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-page">{n}</span>
      <span className="min-w-0 flex-1 text-[15px] leading-snug">{children}</span>
      <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-page px-2">{icon}</span>
    </li>
  )
}
