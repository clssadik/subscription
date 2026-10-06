import { useCallback, useEffect, useState } from 'react'
import { isInstalled, isIOS } from './install'
import { isConfigured, supabase } from './supabase'

// Telefona bildirim (Web Push). Bu telefon izin verince "bildirim adresi" Supabase'e (push_subscriptions) kaydedilir;
// her 15 dakikada çalışan send-reminders fonksiyonu yaklaşan ödemeleri bu adrese gönderir (supabase/functions/send-reminders).

/** Sunucunun herkese açık anahtarı (VAPID). Gizli eşi sadece Supabase'deki fonksiyonda durur. */
const VAPID_PUBLIC_KEY = 'BFVT29HQePlVJboPZDKRBAn307QY7bZB2Xpwx194YjEqwEVCixr8vYcJFMXQ4R3z1ieR_cZUOwSIogXWiwgxdwY'

/**
 * Bu telefonun durumu:
 * - install: iPhone'da tarayıcıdan açılmış; bildirim sadece ana ekrandaki uygulamada çalışır
 * - unsupported: tarayıcı bildirimi desteklemiyor
 * - default: henüz sorulmadı
 * - denied: reddedildi (telefon ayarlarından açılır)
 * - on: izin verildi ve kayıtlı
 */
export type PushState = 'install' | 'unsupported' | 'default' | 'denied' | 'on'

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function keyBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
}

// Son bilinen durum: sayfa tekrar açılınca beklemeden doğru hâli çizilir (yoksa önce boş kutu, sonra içerik gelip sayfa kayıyordu)
let last: PushState | null = null

/** Beklemeden bilinebilen durum. İzin verilmişse aboneliğin hâlâ durduğu varsayılır; current() bir an sonra doğrular. */
function quick(): PushState {
  if (last) return last
  if (isIOS() && !isInstalled()) return 'install'
  if (!supported() || !isConfigured) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'default'
  return 'on'
}

async function current(): Promise<PushState> {
  if (isIOS() && !isInstalled()) return 'install'
  if (!supported() || !isConfigured) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'default'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return 'default'
  // Adres her açılışta yeniden kaydedilir (telefon adresi değiştirebiliyor, hesap değişmiş olabilir); sonucu beklenmez
  save(sub).catch(() => {})
  return 'on'
}

/** Bu telefonun bildirim durumu; enable izin ister ve kaydeder (dokunuşun içinde çağrılmalı) */
export function usePush() {
  const [state, setRaw] = useState<PushState>(quick)
  const setState = useCallback((s: PushState) => {
    last = s
    setRaw(s)
  }, [])

  useEffect(() => {
    let alive = true
    current().then((s) => alive && setState(s), () => alive && setState('unsupported'))
    return () => {
      alive = false
    }
  }, [])

  const enable = useCallback(async () => {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setState(permission === 'denied' ? 'denied' : 'default')
      return
    }
    const reg = await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
    await save(sub)
    setState('on')
  }, [])

  return { state, enable }
}

/** Bu hesabın bütün telefonlarına deneme bildirimi gönderir. Hata varsa mesajını döner. */
export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } })
  if (error) return 'Deneme gönderilemedi. Biraz sonra tekrar deneyin.'
  if (!data?.sent) return 'Bu hesaba kayıtlı telefon bulunamadı.'
  return null
}
