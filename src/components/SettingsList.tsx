import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, type LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { RoundButton } from '@/components/ScreenHeader'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

// Hesap ve alt sayfalarındaki iPhone Ayarlar tarzı parçalar: başlıklı beyaz grup, satır, anahtar (switch), tikli seçim listesi.

export function Group({ title, footer, children, className }: { title?: string; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mt-5', className)}>
      {/* Başlık ve açıklama iPhone Ayarlar'daki gibi: sistem yazı tipi, 13pt, satır yazısıyla aynı hizada (src/index.css → .ios-text) */}
      {title && <h2 className="ios-text mb-1.5 px-3.5 text-[13px] text-subtle uppercase">{title}</h2>}
      {/* Satır arası çizgiler iPhone'daki gibi yazının hizasından başlar (src/index.css → .settings-group) */}
      <div className="settings-group overflow-hidden rounded-[18px] bg-surface">{children}</div>
      {footer && <p className="ios-text mt-1.5 px-3.5 text-[13px] leading-snug text-subtle">{footer}</p>}
    </section>
  )
}

/** Satırın solundaki renkli kare ikon */
export function RowIcon({ Icon, className }: { Icon: LucideIcon; className?: string }) {
  return (
    <span className={cn('flex size-[30px] shrink-0 items-center justify-center rounded-[9px]', className)}>
      <Icon className="size-[17px]" strokeWidth={2} />
    </span>
  )
}

/**
 * Bir ayar satırı. onClick varsa sağda ok olur ve basınca hafif titrer.
 * select verilirse satırın tamamı görünmez bir açılır listeyi kaplar: dokununca iPhone'un kendi seçicisi açılır.
 */
export function Row({
  icon,
  label,
  value,
  onClick,
  trailing,
  danger,
  select,
}: {
  icon?: ReactNode
  label: ReactNode
  value?: ReactNode
  onClick?: () => void
  trailing?: ReactNode
  danger?: boolean
  select?: ReactNode
}) {
  const body = (
    <>
      {icon}
      <span className={cn('min-w-0 flex-1 truncate', danger && 'text-[var(--ios-red)]')}>{label}</span>
      {value != null && <span className="shrink-0 text-[15px] text-subtle">{value}</span>}
      {trailing}
      {(onClick || select) && !trailing && <ChevronRightIcon className="size-4 shrink-0 text-subtle/70" />}
    </>
  )
  const cls = 'relative flex min-h-[52px] w-full items-center gap-3 px-3.5 text-left text-[15px] active:bg-line/60'
  // Simgeli satırda üstteki çizgi simgeden sonra, yazının hizasından başlar (14 + 30 + 12 px)
  const sep = icon ? ({ '--sep': '56px' } as CSSProperties) : undefined
  if (select) return <label className={cls} style={sep}>{body}{select}</label>
  if (onClick)
    return (
      <button
        type="button"
        className={cls}
        style={sep}
        onClick={() => {
          haptic()
          onClick()
        }}
      >
        {body}
      </button>
    )
  return <div className={cls} style={sep}>{body}</div>
}

/** iPhone tarzı açma/kapama anahtarı */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic()
        onChange(!checked)
      }}
      className={cn(
        'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-[var(--ios-green)]' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

/**
 * iPhone Ayarlar'daki gibi tikli seçim satırları (bir grubun içine konur). multiple: birden fazla seçilebilir
 * (ör. 1 gün önce + 3 gün önce), değilse dokunulan tek seçenek seçili olur.
 */
export function CheckList<T extends string | number>({
  options,
  value,
  onChange,
  multiple,
  disabled,
}: {
  options: { value: T; label: string }[]
  value: T[]
  onChange: (v: T[]) => void
  multiple?: boolean
  disabled?: boolean
}) {
  return options.map((o) => {
    const on = value.includes(o.value)
    return (
      <button
        key={o.value}
        type="button"
        role={multiple ? 'checkbox' : 'radio'}
        aria-checked={on}
        disabled={disabled}
        onClick={() => {
          haptic()
          if (!multiple) onChange([o.value])
          else onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])
        }}
        className="flex min-h-[48px] w-full items-center gap-3 px-3.5 text-left text-[15px] active:bg-line/60"
      >
        <span className="min-w-0 flex-1 truncate">{o.label}</span>
        {on && <CheckIcon className="size-[18px] shrink-0 text-[var(--ios-blue)]" strokeWidth={2.4} />}
      </button>
    )
  })
}

/** Alt sayfanın başlığı: solda geri, ortada küçük başlık */
export function SubPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <RoundButton label="Geri" onClick={onBack}>
        <ChevronLeftIcon className="size-5" />
      </RoundButton>
      <span className="text-[17px] font-semibold">{title}</span>
      <span className="size-11" />
    </div>
  )
}
