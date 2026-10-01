import type { User } from '@supabase/supabase-js'
import { LogOutIcon } from 'lucide-react'
import { ScreenHeader } from '@/components/ScreenHeader'
import { formatDate, initial } from '@/lib/format'
import { clearCache, useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'

export function AccountScreen({ user }: { user: User }) {
  const { state } = useStore()
  const email = user.email ?? ''

  async function signOut() {
    clearCache(user.id)
    await supabase.auth.signOut()
  }

  return (
    <>
      <ScreenHeader title="Hesap" />
      <section className="flex flex-col items-center rounded-[120px_120px_22px_22px] bg-bh-yellow px-4 pt-8 pb-5 text-center text-[#141414]">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#141414] font-label text-2xl font-medium text-bh-yellow">
          {initial(email)}
        </div>
        <p className="mt-3 max-w-full truncate font-medium">{email}</p>
        <p className="text-[11px] opacity-75">{formatDate(new Date(user.created_at), 'd MMMM yyyy')} tarihinden beri</p>
      </section>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label="Abonelik" value={state.subscriptions.length} />
        <Stat label="Kart" value={state.cards.length} />
      </div>

      <p className="mt-4 px-1 text-sm text-subtle">
        Verilerin hesabında saklanıyor. Aynı e-postayla başka bir cihazdan girdiğinde hepsi orada olur.
      </p>

      <button onClick={signOut} className="pressable mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-surface font-medium text-bh-red">
        <LogOutIcon className="size-[18px]" /> Çıkış yap
      </button>
    </>
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
