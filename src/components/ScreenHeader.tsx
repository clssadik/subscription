import { PlusIcon, SearchIcon, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

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
    <button onClick={onClick} aria-label={label} className="pressable flex size-11 items-center justify-center rounded-full bg-bh-yellow text-[#141414]">
      <PlusIcon className="size-6" strokeWidth={2} />
    </button>
  )
}

/** Başlıktaki arama düğmesi: arama açıkken basınca kapanır */
export function SearchButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Aramayı kapat' : 'Ara'}
      aria-pressed={open}
      className={cn('pressable flex size-11 items-center justify-center rounded-full', open ? 'bg-ink text-page' : 'bg-surface')}
    >
      <SearchIcon className="size-5" strokeWidth={2.2} />
    </button>
  )
}

/** Başlığın altında açılan arama alanı. Escape ya da "Vazgeç" kapatır. */
export function SearchBar({ value, onChange, onClose, placeholder }: { value: string; onChange: (v: string) => void; onClose: () => void; placeholder: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl bg-surface px-3.5 focus-within:ring-2 focus-within:ring-bh-yellow">
        <SearchIcon className="size-4 shrink-0 text-subtle" />
        <input
          autoFocus
          type="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle/70 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button type="button" aria-label="Temizle" onClick={() => onChange('')} className="-mr-1 flex size-7 items-center justify-center rounded-full text-subtle">
            <XIcon className="size-4" />
          </button>
        )}
      </label>
      <button type="button" onClick={onClose} className="min-h-11 px-1 text-sm text-subtle">
        Vazgeç
      </button>
    </div>
  )
}
