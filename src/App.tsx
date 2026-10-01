import { CreditCardIcon, HomeIcon, RepeatIcon, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { StoreProvider } from '@/lib/store'
import { CardsScreen } from '@/screens/CardsScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { SubscriptionsScreen } from '@/screens/SubscriptionsScreen'

type Tab = 'home' | 'subscriptions' | 'cards'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Özet', icon: HomeIcon },
  { id: 'subscriptions', label: 'Abonelikler', icon: RepeatIcon },
  { id: 'cards', label: 'Kartlar', icon: CreditCardIcon },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <StoreProvider>
      <div className="mx-auto min-h-svh max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
        {tab === 'home' && <HomeScreen />}
        {tab === 'subscriptions' && <SubscriptionsScreen />}
        {tab === 'cards' && <CardsScreen />}
      </div>

      {/* Alt sekme çubuğu; iPhone'un alt çizgisine (home indicator) yer bırakır */}
      <nav className="fixed inset-x-0 bottom-0 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
                tab === id ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
      <Toaster position="top-center" />
    </StoreProvider>
  )
}
