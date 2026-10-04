import type { User } from '@supabase/supabase-js'
import { FlaskConicalIcon, LogOutIcon, MoonIcon, SmartphoneIcon, SunIcon, Trash2Icon, Volume2Icon, VolumeXIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ScreenHeader } from '@/components/ScreenHeader'
import { formatDate, initial } from '@/lib/format'
import { clearCache, useStore } from '@/lib/store'
import { DEMO_ID, demoSignOut } from '@/lib/demo'
import { randomCards, randomSubscriptions } from '@/lib/seed'
import { useUndoable } from '@/lib/undo'
import { play, useSoundEnabled } from '@/lib/sound'
import { supabase } from '@/lib/supabase'
import { type ThemePref, useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export function AccountScreen({ user }: { user: User }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const email = user.email ?? ''
  const demo = user.id === DEMO_ID

  function addTestData() {
    const cards = randomCards(10)
    const subscriptions = randomSubscriptions([...state.cards, ...cards], 10)
    cards.forEach((card) => dispatch({ type: 'card/save', card }))
    subscriptions.forEach((subscription) => dispatch({ type: 'subscription/save', subscription }))
    toast.success('10 abonelik ve 10 kart eklendi')
  }

  async function signOut() {
    // Test hesabının verileri cihazda kalsın; gerçek hesapta çıkarken temizlenir
    if (user.id === DEMO_ID) return demoSignOut()
    clearCache(user.id)
    await supabase.auth.signOut()
  }

  return (
    <>
      <ScreenHeader title="Hesap" />
      <section className="flex flex-col items-center rounded-[120px_120px_22px_22px] metal px-4 pt-8 pb-5 text-center text-[#141414]">
        <div className="flex size-16 items-center justify-center rounded-full bg-white font-label text-2xl font-medium text-[#141414] dark:bg-[#141414] dark:text-metal">
          {initial(email)}
        </div>
        <p className="mt-3 max-w-full truncate font-medium">{email}</p>
        <p className="text-[11px] opacity-75">{formatDate(new Date(user.created_at), 'd MMMM yyyy')} tarihinden beri</p>
      </section>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label="Abonelik" value={state.subscriptions.length} />
        <Stat label="Kart" value={state.cards.length} />
      </div>

      <ThemePicker />
      <SoundPicker />

      <p className="mt-4 px-1 text-sm text-subtle">
        {demo
          ? 'Test hesabı: veriler sadece bu cihazda saklanıyor.'
          : 'Verilerin hesabında saklanıyor. Aynı e-postayla başka bir cihazdan girdiğinde hepsi orada olur.'}
      </p>

      {/* Sadece test hesabında: hızlı deneme için örnek veri */}
      {demo && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={addTestData} className="pressable flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-surface font-medium">
            <FlaskConicalIcon className="size-[18px] text-bh-blue" /> Test verisi ekle
          </button>
          <button
            onClick={() => undoable('Tüm veriler silindi', () => dispatch({ type: 'state/restore', state: { cards: [], subscriptions: [], payments: [], missingLogos: [] } }))}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-surface font-medium"
          >
            <Trash2Icon className="size-[18px] text-bh-red" /> Tüm verileri sil
          </button>
        </div>
      )}

      <button onClick={signOut} className="pressable mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-surface font-medium text-bh-red">
        <LogOutIcon className="size-[18px]" /> Çıkış yap
      </button>
    </>
  )
}

const THEMES: { value: ThemePref; label: string; Icon: typeof SunIcon }[] = [
  { value: 'auto', label: 'Otomatik', Icon: SmartphoneIcon },
  { value: 'light', label: 'Açık', Icon: SunIcon },
  { value: 'dark', label: 'Koyu', Icon: MoonIcon },
]

// Otomatik = telefonun ayarını izler. Seçim bu cihazda saklanır.
function ThemePicker() {
  const { pref, setPref } = useTheme()
  return (
    <section className="mt-4">
      <h2 className="label px-1 text-subtle">Tema</h2>
      <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
        {THEMES.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={pref === value}
            onClick={() => setPref(value)}
            className={cn(
              'pressable flex h-16 flex-col items-center justify-center gap-1 rounded-[18px] font-label text-sm',
              pref === value ? 'metal font-medium text-[#141414]' : 'bg-surface text-subtle',
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}

// Ödendi, kaydet ve sil sesleri. Açınca örnek olarak "ding" çalar. Seçim bu cihazda saklanır.
function SoundPicker() {
  const [enabled, setEnabled] = useSoundEnabled()
  const options = [
    { on: true, label: 'Açık', Icon: Volume2Icon },
    { on: false, label: 'Kapalı', Icon: VolumeXIcon },
  ]
  return (
    <section className="mt-4">
      <h2 className="label px-1 text-subtle">Sesler</h2>
      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Sesler">
        {options.map(({ on, label, Icon }) => (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={enabled === on}
            onClick={() => {
              setEnabled(on)
              if (on) play('paid')
            }}
            className={cn(
              'pressable flex h-16 flex-col items-center justify-center gap-1 rounded-[18px] font-label text-sm',
              enabled === on ? 'metal font-medium text-[#141414]' : 'bg-surface text-subtle',
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-[92px] flex-col rounded-[22px] bg-surface p-3">
      <span className="label text-subtle">{label}</span>
      <span className="num num-bold mt-auto text-3xl">{value}</span>
    </div>
  )
}
