import type { User } from '@supabase/supabase-js'
import {
  BellIcon,
  ChevronRightIcon,
  FileTextIcon,
  FlaskConicalIcon,
  MoonIcon,
  ShieldIcon,
  SmartphoneIcon,
  SquarePlusIcon,
  SunIcon,
  Trash2Icon,
  Volume2Icon,
  WalletIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Wordmark } from '@/components/Brand'
import { LegalSheet, type LegalPage } from '@/components/LegalSheet'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Group, Row, RowIcon, Switch } from '@/components/SettingsList'
import { monthlyCost } from '@/lib/dates'
import { DEMO_ID, demoSignOut } from '@/lib/demo'
import { formatMoney } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { isInstalled } from '@/lib/install'
import { usePush } from '@/lib/push'
import { randomCards, randomSubscriptions } from '@/lib/seed'
import { initials, useSettings } from '@/lib/settings'
import { play, useSoundEnabled } from '@/lib/sound'
import { clearCache, useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { type ThemePref, useTheme } from '@/lib/theme'
import { CURRENCIES } from '@/lib/types'
import { useUndoable } from '@/lib/undo'
import { InstallGuide } from './account/InstallGuide'
import { NotificationSettings } from './account/NotificationSettings'
import { ProfileEditor } from './account/ProfileEditor'
import { SpendingSummary } from './account/SpendingSummary'

// Hesap: iPhone Ayarlar gibi gruplu satırlar. Profil, bildirimler, harcama özeti ve ana ekrana ekle rehberi
// kendi alt sayfalarında açılır (sağdan kayarak; geri sola).

export type AccountPage = 'profile' | 'notifications' | 'spending' | 'install'

const THEME_LABELS: Record<ThemePref, string> = { auto: 'Otomatik', light: 'Açık', dark: 'Koyu' }

/**
 * Hesap'ın alt sayfaları. App.tsx bunları abonelik/kart detayı gibi açar: sağdan kayarak gelir, sağa çekince
 * alttaki Hesap ekranı görünerek geri dönülür (src/lib/useSwipeBack.ts).
 */
export function AccountSubPage({ page, user, onBack }: { page: AccountPage; user: User; onBack: () => void }) {
  if (page === 'profile') return <ProfileEditor user={user} onBack={onBack} />
  if (page === 'notifications') return <NotificationSettings userId={user.id} onBack={onBack} />
  if (page === 'spending') return <SpendingSummary onBack={onBack} />
  return <InstallGuide onBack={onBack} />
}

export function AccountScreen({ user, open }: { user: User; open: (page: AccountPage) => void }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const { settings } = useSettings(user.id)
  const { state: pushState } = usePush()
  const { pref, setPref } = useTheme()
  const [sound, setSound] = useSoundEnabled()
  const [legal, setLegal] = useState<LegalPage | null>(null)
  const email = user.email ?? ''
  const demo = user.id === DEMO_ID
  const notify = settings.notify
  // Aylık toplam her para biriminde ayrı (TL önce); kur bilgisi olmadığı için birbirine eklenmez
  const monthly = CURRENCIES.map((currency) => ({
    currency,
    total: state.subscriptions.filter((s) => s.currency === currency).reduce((sum, s) => sum + monthlyCost(s), 0),
  })).filter((t) => t.total > 0)
  const monthlyText = monthly.map((t) => formatMoney(t.total, t.currency)).join(' + ')

  function addTestData() {
    const cards = randomCards(10)
    const subscriptions = randomSubscriptions([...state.cards, ...cards], 10)
    cards.forEach((card) => dispatch({ type: 'card/save', card }))
    subscriptions.forEach((subscription) => dispatch({ type: 'subscription/save', subscription }))
    toast.success('10 abonelik ve 10 kart eklendi')
  }

  async function signOut() {
    haptic()
    // Test hesabının verileri cihazda kalsın; gerçek hesapta çıkarken temizlenir
    if (user.id === DEMO_ID) return demoSignOut()
    clearCache(user.id)
    await supabase.auth.signOut()
  }

  return (
    <>
      <ScreenHeader title="Hesap" />

      {/* Profil: iPhone Ayarlar'daki Apple Hesabı satırı gibi; dokununca ad düzenlenir */}
      <Group>
        <button
          type="button"
          onClick={() => {
            haptic()
            open('profile')
          }}
          className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-line/60"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#A4A4AA] font-label text-xl font-medium text-white dark:bg-[#636366]">
            {initials(settings.name, email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className={settings.name ? 'block truncate text-lg font-medium' : 'block text-lg text-subtle'}>
              {settings.name || 'Ad ekle'}
            </span>
            <span className="block truncate text-sm text-subtle">{email}</span>
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-subtle/70" />
        </button>
      </Group>

      {/* iPhone Ayarlar gibi başlıksız küçük gruplar */}
      <Group>
        <Row
          icon={<RowIcon Icon={BellIcon} className="bg-[var(--tile)] text-ink" />}
          label="Bildirimler"
          // Ayar açık olsa da telefon izni yoksa (ya da kayıtlı değilse) bildirim gelmez
          value={pushState === 'on' && notify.enabled ? 'Açık' : 'Kapalı'}
          onClick={() => open('notifications')}
        />
        <Row
          icon={<RowIcon Icon={Volume2Icon} className="bg-[var(--tile)] text-ink" />}
          label="Sesler"
          trailing={
            <Switch
              label="Sesler"
              checked={sound}
              onChange={(on) => {
                setSound(on)
                if (on) play('paid')
              }}
            />
          }
        />
      </Group>

      <Group>
        <Row
          icon={<RowIcon Icon={pref === 'dark' ? MoonIcon : pref === 'light' ? SunIcon : SmartphoneIcon} className="bg-[var(--tile)] text-ink" />}
          label="Tema"
          value={THEME_LABELS[pref]}
          select={
            <select
              aria-label="Tema"
              value={pref}
              onChange={(e) => {
                haptic()
                setPref(e.target.value as ThemePref)
              }}
              className="absolute inset-0 opacity-0"
            >
              {Object.entries(THEME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          }
        />
        <Row
          icon={<RowIcon Icon={SquarePlusIcon} className="bg-[var(--tile)] text-ink" />}
          label="Ana ekrana ekle"
          value={isInstalled() ? 'Eklendi' : undefined}
          onClick={() => open('install')}
        />
      </Group>

      <Group>
        <Row
          icon={<RowIcon Icon={WalletIcon} className="bg-[var(--tile)] text-ink" />}
          label="Harcama özeti"
          // Uzun tutarlar satırı taşırmasın diye kesilir; TL başta olduğu için en sondaki para birimi kesilir
          value={monthly.length ? <span className="block max-w-44 truncate">{monthlyText}/ay</span> : undefined}
          onClick={() => open('spending')}
        />
      </Group>

      <Group>
        <Row icon={<RowIcon Icon={FileTextIcon} className="bg-[var(--tile)] text-ink" />} label="Kullanım şartları" onClick={() => setLegal('terms')} />
        <Row icon={<RowIcon Icon={ShieldIcon} className="bg-[var(--tile)] text-ink" />} label="Gizlilik" onClick={() => setLegal('privacy')} />
      </Group>

      {/* Sadece test hesabında: hızlı deneme için örnek veri */}
      {demo && (
        <Group title="Test hesabı" footer="Veriler sadece bu cihazda saklanıyor.">
          <Row icon={<RowIcon Icon={FlaskConicalIcon} className="bg-[var(--tile)] text-ink" />} label="Test verisi ekle" onClick={addTestData} />
          <Row
            icon={<RowIcon Icon={Trash2Icon} className="bg-[var(--tile)] text-ink" />}
            label="Tüm verileri sil"
            danger
            onClick={() => undoable('Tüm veriler silindi', () => dispatch({ type: 'state/restore', state: { cards: [], subscriptions: [], payments: [], missingLogos: [] } }))}
          />
        </Group>
      )}

      <Group>
        <button type="button" onClick={signOut} className="flex min-h-[52px] w-full items-center justify-center text-[15px] text-[var(--ios-red)] active:bg-line/60">
          Çıkış yap
        </button>
      </Group>

      <p className="mt-6 text-center text-[12px] text-subtle"><Wordmark /></p>
      <LegalSheet page={legal} onClose={() => setLegal(null)} />
    </>
  )
}
