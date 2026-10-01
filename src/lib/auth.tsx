import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { demoUser, isDemoSignedIn, onDemoAuth } from './demo'
import { isConfigured, supabase } from './supabase'

/** Giriş yapmış kullanıcı; yoksa null, oturum henüz okunmadıysa undefined. */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(() =>
    isConfigured ? undefined : isDemoSignedIn() ? demoUser : null,
  )

  useEffect(() => {
    if (!isConfigured) return onDemoAuth(() => setUser(isDemoSignedIn() ? demoUser : null))
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}
