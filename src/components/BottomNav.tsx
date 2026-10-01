import { CreditCardIcon, HistoryIcon, HomeIcon, PlusIcon, RepeatIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tab = 'home' | 'subscriptions' | 'cards' | 'history'

const LEFT: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Özet', icon: HomeIcon },
  { id: 'subscriptions', label: 'Abonelikler', icon: RepeatIcon },
]
const RIGHT: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'cards', label: 'Kartlar', icon: CreditCardIcon },
  { id: 'history', label: 'Geçmiş', icon: HistoryIcon },
]

/** Havada duran alt menü; ortada sarı "+" */
export function BottomNav({ tab, onTab, onAdd }: { tab: Tab; onTab: (t: Tab) => void; onAdd: () => void }) {
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
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-[28px] bg-nav p-1.5 dark:ring-1 dark:ring-white/12">
        {LEFT.map(item)}
        <button
          onClick={onAdd}
          aria-label="Yeni ekle"
          className="pressable flex size-12 items-center justify-center rounded-full bg-bh-yellow text-[#141414]"
        >
          <PlusIcon className="size-6" strokeWidth={2} />
        </button>
        {RIGHT.map(item)}
      </div>
    </nav>
  )
}
