import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Form içindeki gruplanmış alan kutusu */
export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line overflow-hidden rounded-[18px] bg-surface">{children}</div>
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
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
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
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex rounded-xl bg-page p-0.5 text-sm', className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-9 flex-1 rounded-[10px] px-2 transition-colors',
            value === o.value ? 'bg-bh-yellow font-medium text-[#141414]' : 'text-subtle',
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
      className={cn('pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-bh-yellow font-label text-base font-semibold text-[#141414]', className)}
      {...props}
    >
      {children}
    </button>
  )
}
