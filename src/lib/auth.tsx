import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { DEMO_ID, demoUser, isDemoSignedIn, onDemoAuth } from './demo'
import { forgetDevice } from './push'
import { clearSettingsCache } from './settings'
import { clearCache } from './store'
import { isConfigured, supabase } from './supabase'
import { transition } from './transition'

// Kod doğrulanınca giriş ekranı kısa bir "başarılı" anı gösterir; bu sürede gelen oturum bekletilir,
// sonra Anasayfa yumuşak bir geçişle açılır (src/screens/AuthScreens.tsx CodeStep).
let held = false
let pending: (() => void) | null = null

/** Bundan sonra gelen girişi releaseSignIn çağrılana kadar beklet */
export function holdSignIn() {
  held = true
}

/** Bekletilen girişi uygula (doğrulama başarısızsa bekleyen bir şey yoktur, sadece bekletme kalkar) */
export function releaseSignIn() {
  held = false
  const run = pending
  pending = null
  run?.()
}

/** Çıkan hesabın bu cihazdaki kopyaları (son veriler, ayarlar) silinir. Önce eşitleme durur ki yarım kalan bir okuma kopyayı geri yazmasın.
 *  Test hesabının verisine dokunulmaz. */
function clearAccount(userId: string) {
  if (userId === DEMO_ID) return
  clearCache(userId)
  clearSettingsCache(userId)
}

/** Giriş yapmış kullanıcı; yoksa null, oturum henüz okunmadıysa undefined. */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(() =>
    isConfigured ? undefined : isDemoSignedIn() ? demoUser : null,
  )

  useEffect(() => {
    const apply = (next: User | null) => {
      if (!next) return setUser(null)
      const run = () => transition('fade', () => setUser(next))
      if (held) pending = run
      else setUser(next)
    }
    if (!isConfigured) return onDemoAuth(() => apply(isDemoSignedIn() ? demoUser : null))
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    // Son oturum açık kalan hesap: oturum zorla kapanırsa (süresi doldu, başka sekmede çıkıldı) onun cihazdaki kopyası silinir
    let lastId: string | null = null
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) lastId = session.user.id
      else if (event === 'SIGNED_OUT' && lastId) {
        clearAccount(lastId)
        void forgetDevice()
        lastId = null
      }
      apply(session?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}
