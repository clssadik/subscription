import { ChevronsUpDownIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { dayOf } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Form içindeki gruplanmış alan kutusu. Taşmayı kesmez: ad önerileri listesi alttaki alanların üstüne açılabilsin.
 * data-collapsed ile kapanmış bir satırın üstündeki ayırıcı çizgi gizlenir (kutunun dibinde çizgi kalmasın).
 */
export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line rounded-[18px] bg-surface [&>*:has(+[data-collapsed])]:border-b-0">{children}</div>
}

export function Field({ label, htmlFor, stacked, children }: { label: string; htmlFor?: string; stacked?: boolean; children: ReactNode }) {
  if (stacked) {
    return (
      <div className="grid gap-2 px-3.5 py-3">
        <label htmlFor={htmlFor} className="label text-subtle">{label}</label>
        {children}
      </div>
    )
  }
  return (
    <div className="flex min-h-12 items-center gap-3 px-3.5 py-1.5">
      <label htmlFor={htmlFor} className="label w-24 shrink-0 text-subtle">{label}</label>
      <div className="relative flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  )
}

// iPhone'da 16px altı yazı tipli alanlara dokununca sayfa yakınlaşıyor; o yüzden text-base.
export const inputClass = 'w-full min-w-0 bg-transparent text-base outline-none placeholder:text-subtle/60'
export const selectClass = 'bg-transparent text-base font-medium text-bh-blue outline-none dark:text-[#6E9BFF]'

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  activeClass = 'bg-bh-yellow text-[#141414]',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
  /** Seçili düğmenin rengi */
  activeClass?: string
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    // İç düğmenin köşesi = dış köşe - boşluk (18 - 4 = 14px): ikisi aynı eğriyi izler
    <div className={cn('relative flex rounded-[18px] bg-page p-1 text-sm', className)} role="radiogroup">
      {/* Seçili zemin: seçim değişince yeni seçeneğin altına kayar */}
      <span
        aria-hidden
        className={cn('absolute top-1 bottom-1 left-1 rounded-[14px] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]', activeClass)}
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative min-h-9 flex-1 rounded-[14px] px-2 transition-colors duration-300',
            value === o.value ? cn('font-medium', activeClass, 'bg-transparent dark:bg-transparent shadow-none') : 'text-subtle',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PrimaryButton({ children, className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      className={cn('pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-ink font-label text-base font-semibold text-page', className)}
      {...props}
    >
      {children}
    </button>
  )
}

/** Ayın günü seçimi: iPhone'da kaydırmalı seçici açılır, seçilince "Her ayın 15'i" yazar */
export function DaySelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: number | null
  onChange: (day: number) => void
}) {
  return (
    <div className="relative flex w-full items-center">
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn('w-full appearance-none bg-transparent pr-6 text-base outline-none', value ? 'text-ink' : 'text-subtle/60')}
      >
        <option value="" disabled>Gün seçin</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>Her ayın {dayOf(d)}</option>
        ))}
      </select>
      <ChevronsUpDownIcon aria-hidden className="pointer-events-none absolute right-0 size-4 text-subtle" />
    </div>
  )
}
