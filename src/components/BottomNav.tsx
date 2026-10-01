import { CreditCardIcon, HistoryIcon, HomeIcon, RepeatIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tab = 'home' | 'subscriptions' | 'account' | 'cards' | 'history'

const LEFT: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Özet', icon: HomeIcon },
  { id: 'subscriptions', label: 'Abonelikler', icon: RepeatIcon },
]
const RIGHT: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'cards', label: 'Kartlar', icon: CreditCardIcon },
  { id: 'history', label: 'Geçmiş', icon: HistoryIcon },
]

/** Havada duran alt menü; ortada hesap butonu (e-postanın baş harfi) */
export function BottomNav({ tab, onTab, initial }: { tab: Tab; onTab: (t: Tab) => void; initial: string }) {
  const item = ({ id, label, icon: Icon }: (typeof LEFT)[number]) => (
    <button
      key={id}
      onClick={() => onTab(id)}
      aria-label={label}
      aria-current={tab === id ? 'page' : undefined}
      className={cn('pressable flex size-12 items-center justify-center', tab === id ? 'text-bh-yellow' : 'text-nav-off')}
    >
      <Icon className="size-[22px]" strokeWidth={1.8} />
    </button>
  )
  const onAccount = tab === 'account'
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-[28px] bg-nav p-1.5 dark:ring-1 dark:ring-white/12">
        {LEFT.map(item)}
        <button
          onClick={() => onTab('account')}
          aria-label="Hesap"
          aria-current={onAccount ? 'page' : undefined}
          className={cn(
            'pressable flex size-12 items-center justify-center rounded-full font-label text-lg font-medium',
            onAccount ? 'bg-bh-yellow text-[#141414]' : 'bg-white/10 text-bh-yellow',
          )}
        >
          {initial}
        </button>
        {RIGHT.map(item)}
      </div>
    </nav>
  )
}
