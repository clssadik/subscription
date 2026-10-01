import { PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDate } from '@/lib/format'

export function ScreenHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="mb-3 flex items-center justify-between px-1">
      <div>
        <div className="label text-subtle">{formatDate(new Date(), 'd MMMM EEEE')}</div>
        <h1 className="num num-bold text-[28px] leading-tight">{title}</h1>
      </div>
      {action}
    </header>
  )
}

export function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="pressable flex size-11 items-center justify-center rounded-full bg-surface">
      {children}
    </button>
  )
}

/** Başlığın sağındaki sarı "+" */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="pressable flex size-11 items-center justify-center rounded-full bg-bh-yellow text-[#141414]">
      <PlusIcon className="size-6" strokeWidth={2} />
    </button>
  )
}

/** Boş ekranlarda: ne yapılacağını söyleyen davet */
export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-surface p-5 text-center">
      <div className="mx-auto mb-3 h-10 w-20 rounded-t-full bg-bh-yellow" aria-hidden />
      <p className="font-label text-lg font-medium">{title}</p>
      <p className="mt-1 text-sm text-subtle">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
