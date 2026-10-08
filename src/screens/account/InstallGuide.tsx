import { CheckIcon, EllipsisIcon, PlusSquareIcon, ShareIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { SubPageHeader } from '@/components/SettingsList'
import { isAndroid, isInstalled } from '@/lib/install'
import { cn } from '@/lib/utils'

/** Hesap → Ana ekrana ekle: eklendiyse bilgi, değilse adımlar */
export function InstallGuide({ onBack }: { onBack: () => void }) {
  return (
    <>
      <SubPageHeader title="Ana ekrana ekle" onBack={onBack} />

      {isInstalled() ? (
        <div className="mt-5 flex min-h-[52px] items-center gap-3 rounded-[18px] bg-surface px-3.5 text-[15px]">
          <CheckIcon className="size-[18px] text-bh-green" strokeWidth={2.4} />
          Ana ekrana eklendi
        </div>
      ) : (
        <InstallSteps className="mt-5 rounded-[18px] bg-surface px-3.5 py-1.5" />
      )}
    </>
  )
}

/** Ana ekrana ekleme adımları (açılıştaki rehber ve Hesap → Ana ekrana ekle). Android'de tarayıcı menüsü adımları. */
export function InstallSteps({ className }: { className?: string }) {
  if (isAndroid())
    return (
      <ol className={cn('grid gap-1', className)}>
        <Step n={1} icon={<EllipsisIcon className="size-5 rotate-90" />}>
          Sağ üstteki menü
        </Step>
        <Step n={2} icon={<PlusSquareIcon className="size-5" />}>
          Ana ekrana ekle
        </Step>
        <Step n={3} icon={<span className="font-medium text-bh-blue dark:text-[#6E9BFF]">Ekle</span>}>
          Ekle ile onaylayın
        </Step>
      </ol>
    )
  return (
    <ol className={cn('grid gap-1', className)}>
      <Step n={1} icon={<ShareIcon className="size-5 text-bh-blue dark:text-[#6E9BFF]" />}>
        Alttaki Paylaş <span className="text-subtle">(yoksa önce •••)</span>
      </Step>
      <Step n={2} icon={<PlusSquareIcon className="size-5" />}>
        Ana Ekrana Ekle
      </Step>
      <Step n={3} icon={<span className="font-medium text-bh-blue dark:text-[#6E9BFF]">Ekle</span>}>
        Sağ üstte Ekle
      </Step>
    </ol>
  )
}

function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-h-10 items-center gap-3.5 text-[15px]">
      <span className="num font-medium w-3 shrink-0">{n}</span>
      <span className="min-w-0 flex-1">{children}</span>
      <span className="flex shrink-0 items-center">{icon}</span>
    </li>
  )
}
