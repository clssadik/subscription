import { CreditCardIcon, HistoryIcon, HomeIcon, RepeatIcon, UserIcon, type LucideIcon } from 'lucide-react'
import { BOTTOM_FOG } from '@/lib/fog'
import { cn } from '@/lib/utils'

export type Tab = 'home' | 'subscriptions' | 'account' | 'cards' | 'history'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Anasayfa', icon: HomeIcon },
  { id: 'subscriptions', label: 'Abonelikler', icon: RepeatIcon },
  { id: 'cards', label: 'Kartlar', icon: CreditCardIcon },
  { id: 'history', label: 'Geçmiş', icon: HistoryIcon },
]

/**
 * Havada duran cam (liquid glass) alt menü: dört sekme bir cam kapsülde,
 * hesap butonu sağda ayrı bir cam dairede (girişliyse e-postanın baş harfi, değilse kişi ikonu).
 */
export function BottomNav({ tab, onTab, initial }: { tab: Tab; onTab: (t: Tab) => void; initial: string | null }) {
  const onAccount = tab === 'account'
  const bottomFog = BOTTOM_FOG[tab === 'cards' ? 'light' : 'normal']
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] [view-transition-name:bottom-nav]">
      {/* Kenar solması (iOS'taki gibi): içerik menüye yaklaşırken zemin rengine karışır, cam izi bulanıklaştırır.
          Sis seviyesi src/lib/fog.ts içinde; Kartlar'da daha az. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10"
        style={{ height: `calc(100% + ${bottomFog.above}px)`, background: `linear-gradient(to top, var(--page) ${bottomFog.solid}%, transparent)` }}
      />
      <div className="mx-auto flex max-w-md items-center gap-2.5">
        <div className="glass flex flex-1 items-center justify-around rounded-full p-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTab(id)}
              aria-label={label}
              aria-current={tab === id ? 'page' : undefined}
              className={cn(
                'pressable flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors',
                tab === id ? 'glass-on text-ink' : 'text-ink/75',
              )}
            >
              <Icon className={cn('size-[22px]', tab === id && 'text-[#C9930A] dark:text-bh-yellow')} strokeWidth={1.8} />
              <span className="font-label text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => onTab('account')}
          aria-label={initial ? 'Hesap' : 'Giriş yap'}
          aria-current={onAccount ? 'page' : undefined}
          className={cn('glass pressable flex size-[62px] shrink-0 items-center justify-center rounded-full', onAccount && 'glass-on')}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-bh-yellow font-label text-lg font-medium text-[#141414]">
            {initial ?? <UserIcon className="size-[22px]" strokeWidth={1.8} />}
          </span>
        </button>
      </div>
    </nav>
  )
}
