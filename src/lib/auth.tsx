import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { demoUser, isDemoSignedIn, onDemoAuth } from './demo'
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
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}
