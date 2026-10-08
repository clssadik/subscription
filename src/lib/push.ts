import { useCallback, useEffect, useSyncExternalStore } from 'react'
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
 * - default: henüz sorulmadı; ya da izin var ama adres kaydedilemedi (izin düğmesiyle tekrar denenir)
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

/** Söz en çok ms bekler; yetişmezse ya da hata verirse undefined döner (sayfa ya da çıkış takılı kalmasın) */
function within<T>(work: PromiseLike<T>, ms: number): Promise<T | undefined> {
  let timer = 0
  const limit = new Promise<undefined>((resolve) => {
    timer = window.setTimeout(resolve, ms)
  })
  return Promise.race([Promise.resolve(work).catch(() => undefined), limit]).finally(() => window.clearTimeout(timer))
}

/** Servis çalışanı hazır olana kadar bekler; 3 sn'de olmazsa (ör. geliştirme sunucusu, servis çalışanı yok) undefined döner */
const swReady = () => ('serviceWorker' in navigator ? within(navigator.serviceWorker.ready, 3000) : Promise.resolve(undefined))

/** Sunucuya ulaşılamadı (internet yok): adres bir sonraki açılışta yeniden kaydedilir */
class Offline extends Error {}

/**
 * Adresi hesaba kaydeder. Telefon önceki bir hesaba bağlıysa (çıkış yapılmadan hesap değiştiyse) adres
 * claim_push_subscription ile yeni hesaba taşınır. Fonksiyon veritabanında yoksa doğrudan tabloya yazılır.
 */
async function save(sub: PushSubscription) {
  const json = sub.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!p256dh || !auth) throw new Error('Bildirim anahtarı alınamadı')
  const { error, status } = await supabase.rpc('claim_push_subscription', { p_endpoint: sub.endpoint, p_p256dh: p256dh, p_auth: auth })
  if (!error) return
  // İstek hiç gitmediyse (status 0) sunucu reddetmedi; internet yoktur
  if (status === 0 || !navigator.onLine) throw new Offline(error.message)
  if (error.code !== 'PGRST202' && status !== 404) throw new Error(error.message)
  const { error: upsertError } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, p256dh, auth }, { onConflict: 'endpoint' })
  if (upsertError) throw new Error(upsertError.message)
}

/** Adresi hesaptan siler (oturum açıkken; veritabanı yalnızca kendi satırını siler) ve aboneliği kapatır */
async function drop(sub: PushSubscription) {
  await within(supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint), 3000)
  await sub.unsubscribe()
}

/**
 * Çıkış yapılırken: bu telefonun adresi hesaptan silinir ve bildirim aboneliği kapatılır; böylece eski hesabın
 * hatırlatmaları bu telefona gelmez. Hata olursa sessizce geçilir, çünkü internetsiz de çıkış yapılabilmeli.
 */
export async function forgetDevice(): Promise<void> {
  try {
    if (!supported()) return
    const reg = await swReady()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await drop(sub)
  } catch {
    // İnternet yoksa adres sunucuda kalabilir; abonelik kapandıysa sunucu bir sonraki gönderimde adresi kendisi siler
  }
}

/** Abonelik bu uygulamanın anahtarıyla mı açılmış; anahtar değişmişse eski abonelik çalışmaz */
function sameServerKey(sub: PushSubscription) {
  const have = sub.options?.applicationServerKey
  // Tarayıcı bu bilgiyi vermiyorsa olduğu gibi bırakılır
  if (have === undefined) return true
  if (!have) return false
  const want = keyBytes(VAPID_PUBLIC_KEY)
  const got = new Uint8Array(have)
  return got.length === want.length && got.every((b, i) => b === want[i])
}

/** Bu telefonun aboneliğini kurup adresi kaydeder. İzin verilmiş olmalı (soru sorulmaz). Hata dışarı çıkar. */
async function subscribeAndSave(reg: ServiceWorkerRegistration) {
  const existing = await reg.pushManager.getSubscription()
  if (existing && sameServerKey(existing)) return save(existing)
  // Abonelik yoksa ya da anahtarı eskiyse: varsa kapatılır, yenisi açılır
  if (existing) await drop(existing)
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) })
  await save(sub)
}

// Son bilinen durum: sayfa tekrar açılınca beklemeden doğru hâli çizilir (yoksa önce boş kutu, sonra içerik gelip sayfa kayıyordu).
// Durum tek yerde tutulur ve değişince bütün ekranlara bildirilir: Hesap satırı ile Bildirimler sayfası aynı durumu gösterir.
let last: PushState | null = null
const listeners = new Set<() => void>()

function setState(s: PushState) {
  last = s
  listeners.forEach((fn) => fn())
}

function subscribeState(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

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
  const reg = await swReady()
  if (!reg) return 'unsupported'
  try {
    // Adres her açılışta ve uygulama öne gelince yeniden kaydedilir (telefon adresi değiştirebiliyor, hesap değişmiş olabilir).
    // İzin zaten verilmiş; abonelik yoksa soru sorulmadan yeniden kurulur
    await subscribeAndSave(reg)
    return 'on'
  } catch (e) {
    // İnternet yoksa abonelik telefonda duruyor ve adres zaten kayıtlıdır; bir sonraki açılışta yeniden kaydedilir
    if (e instanceof Offline && (await reg.pushManager.getSubscription())) return 'on'
    // Sunucu kaydı reddettiyse "açık" denmez; izin düğmesiyle tekrar denenir
    console.warn('Bildirim adresi kaydedilemedi:', e)
    return 'default'
  }
}

// Aynı anda iki kontrol çalışmasın: sürmekte olan kontrol bitene kadar yeni istek onun sonucunu bekler
let checking: Promise<void> | null = null

/** Durumu yeniden kontrol eder (adresi de yeniden kaydeder) ve bütün ekranlara bildirir */
function refresh(): Promise<void> {
  if (!checking) {
    checking = current()
      .then(setState, () => setState('unsupported'))
      .finally(() => {
        checking = null
      })
  }
  return checking
}

/** Bu telefonun bildirim durumu; enable izin ister ve kaydeder (dokunuşun içinde çağrılmalı) */
export function usePush() {
  const state = useSyncExternalStore(subscribeState, quick)

  useEffect(() => {
    // iPhone Ayarlar'dan izin değişmiş olabilir: uygulama öne gelince yeniden bakılır
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    void refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const enable = useCallback(async () => {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setState(permission === 'denied' ? 'denied' : 'default')
      return
    }
    const reg = await swReady()
    if (!reg) {
      setState('unsupported')
      return
    }
    // Kaydedilemezse hata dışarı çıkar (ekrandaki uyarı gösterir); durum "açık" olmaz
    await subscribeAndSave(reg)
    setState('on')
  }, [])

  return { state, enable }
}
