import { PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDate } from '@/lib/format'

export function ScreenHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="mb-3 flex min-h-11 items-center justify-between px-1">
      <h1 className="num num-bold text-[28px] leading-tight">{title}</h1>
      {action}
    </header>
  )
}

/** Ana sayfa başlığı: bugünün günü büyük, ay ve gün adı yanında */
export function DateHeader({ action }: { action?: ReactNode }) {
  const today = new Date()
  return (
    <header className="mb-3 flex items-end gap-2.5 px-1">
      <h1 className="flex items-end gap-2.5">
        <span className="num num-bold text-[64px] leading-[0.8] tracking-[-0.05em]">{today.getDate()}</span>
        <span className="pb-0.5">
          <span className="block font-label text-lg leading-tight font-medium">{formatDate(today, 'LLLL')}</span>
          <span className="block text-sm text-subtle">{formatDate(today, 'EEEE')}</span>
        </span>
      </h1>
      <span className="ml-auto">{action}</span>
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
    <button onClick={onClick} aria-label={label} className="pressable flex size-11 items-center justify-center rounded-full metal text-[#141414]">
      <PlusIcon className="size-6" strokeWidth={2} />
    </button>
  )
}

