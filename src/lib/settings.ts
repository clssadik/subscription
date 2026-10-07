import { useEffect, useSyncExternalStore } from 'react'
import { DEMO_ID } from './demo'
import { isConfigured, supabase } from './supabase'

// Kullanıcının ayarları: profil adı ve bildirim tercihleri. Hesapta (Supabase user_settings tablosu) saklanır,
// cihazda da bir kopyası durur (hızlı ve internetsiz açılış). 4. adımda bildirimleri gönderen sunucu ayarları oradan okuyacak.
// Test hesabında sadece cihazda kalır.

/** Kaç gün önce hatırlatılsın; 0 = ödeme günü */
export type ReminderDay = 0 | 1 | 3 | 7
export const REMINDER_DAYS: ReminderDay[] = [0, 1, 3, 7]

export interface NotifySettings {
  /** Bütün hatırlatmalar */
  enabled: boolean
  /** Abonelik yenilenmesinden kaç gün önce (birden fazla olabilir) */
  subscriptionDays: ReminderDay[]
  /** Kart son ödemesinden kaç gün önce */
  cardDays: ReminderDay[]
  /** Hesap kesilince ("ekstre kesildi") haber ver */
  statement: boolean
  /** Bildirim saati, "HH:mm" */
  time: string
  /** Son gün geçtiği hâlde "ödendi" işaretlenmemişse ertesi gün tekrar hatırlat */
  overdue: boolean
  /** Toplu özet: her pazartesi ya da her ayın 1'i */
  summary: 'off' | 'weekly' | 'monthly'
  /** Abonelik bazında: kapalı ya da kendi süresi (yoksa genel ayar geçerli) */
  perSubscription: Record<string, 'off' | ReminderDay>
}

export interface Settings {
  /** Profil adı; boşsa e-posta kullanılır */
  name: string
  notify: NotifySettings
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  notify: {
    enabled: true,
    subscriptionDays: [1],
    cardDays: [3, 1],
    statement: true,
    time: '09:00',
    overdue: true,
    summary: 'weekly',
    perSubscription: {},
  },
}

const key = (userId: string) => `abonelik-takip:settings:${userId}`
const listeners = new Set<() => void>()
const cache = new Map<string, Settings>()

function read(userId: string): Settings {
  const hit = cache.get(userId)
  if (hit) return hit
  let value = DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(key(userId))
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Settings>
      value = { ...DEFAULT_SETTINGS, ...saved, notify: { ...DEFAULT_SETTINGS.notify, ...saved.notify } }
    }
  } catch {
    // okunamıyorsa varsayılanlar
  }
  cache.set(userId, value)
  return value
}

/** Hesaptaki ayarlarla mı çalışılıyor (test hesabı ya da Supabase'siz kurulumda hayır) */
const remote = (userId: string) => isConfigured && userId !== DEMO_ID

// Sunucuya gönderilmemiş alanlar (profil adı, bildirimler). Yalnızca bunlar gönderilir; diğer alanlara dokunulmaz.
type Field = 'name' | 'notify'
const dirty = new Map<string, Set<Field>>()
// Her yerel değişiklikte artar: gönderim sırasında yeni değişiklik olduysa bekleyen alan silinmez
const version = new Map<string, number>()
// Art arda değişiklikler (ör. saat seçerken) tek seferde gönderilsin
const pending = new Map<string, number>()
// Aynı hesabın gönderimleri sırayla gider: sonuncusu en son değeri taşır
const chain = new Map<string, Promise<void>>()
// Hesaptaki ayarlar her açılışta bir kez okunur. synced: okuma bitti (ad zorunluluğu buna bakar: yeni telefonda ad
// sunucudan gelmeden "adı yok" sanılıp ad ekranı bir an çıkmasın). Okunmadan hiçbir şey gönderilmez.
const loaded = new Set<string>()
const synced = new Set<string>()
// Ekranda açık olan hesaplar: bağlantı gelince okuma ya da gönderme yeniden denenir
const watched = new Set<string>()

/** Değişen alanları bekleyenlere ekler */
function markDirty(userId: string, prev: Settings, next: Settings) {
  const fields = new Set(dirty.get(userId))
  if (prev.name !== next.name) fields.add('name')
  if (JSON.stringify(prev.notify) !== JSON.stringify(next.notify)) fields.add('notify')
  if (fields.size === 0) return
  dirty.set(userId, fields)
  version.set(userId, (version.get(userId) ?? 0) + 1)
}

function write(userId: string, value: Settings, sync = true) {
  const remoteWrite = sync && remote(userId)
  if (remoteWrite) markDirty(userId, read(userId), value)
  cache.set(userId, value)
  try {
    localStorage.setItem(key(userId), JSON.stringify(value))
  } catch {
    // depolama kapalıysa sadece bu oturumda geçerli
  }
  if (remoteWrite) scheduleSend(userId)
  listeners.forEach((l) => l())
}

/** Değişiklikler art arda gelirse tek gönderim olur. Sunucu okunmadan bir şey gönderilmez: okuma bitince bekleyenler gider. */
function scheduleSend(userId: string) {
  if (!synced.has(userId)) return
  window.clearTimeout(pending.get(userId))
  pending.set(
    userId,
    window.setTimeout(() => {
      pending.delete(userId)
      enqueue(userId)
    }, 600),
  )
}

function enqueue(userId: string) {
  chain.set(
    userId,
    (chain.get(userId) ?? Promise.resolve()).then(() => send(userId)).catch(() => {}),
  )
}

/** Yalnızca değişen alanları yazar (kayıt yoksa oluşturur). Diğer sütunlara dokunulmaz. */
async function send(userId: string) {
  const fields = dirty.get(userId)
  if (!fields || fields.size === 0 || !synced.has(userId)) return
  const sent = version.get(userId) ?? 0
  const current = read(userId)
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
  if (fields.has('name')) row.name = current.name
  if (fields.has('notify')) row.notify = current.notify
  const { error } = await supabase.from('user_settings').upsert(row)
  // Gönderilemezse cihazdaki kopya kalır; bağlantı gelince ya da bir sonraki değişiklikte yeniden denenir
  if (error) {
    console.warn('Ayarlar kaydedilemedi:', error.message)
    return
  }
  if ((version.get(userId) ?? 0) === sent) dirty.delete(userId)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Hesaptaki ayarları okur. Okunamazsa bağlantı gelince yeniden denenir. */
async function loadRemote(userId: string) {
  if (loaded.has(userId)) return
  loaded.add(userId)
  const { data, error } = await supabase.from('user_settings').select('name, notify').eq('user_id', userId).maybeSingle()
  // Hesap bu arada çıkışla temizlendiyse kopyayı yeniden yazmaz
  if (!watched.has(userId)) return
  if (error) {
    loaded.delete(userId)
    return
  }
  synced.add(userId)
  // Sunucu okunmadan yapılan değişiklikler: cihazdaki değerleriyle kalır ve gönderilir; diğer alanlar sunucudan gelir
  const early = new Set(dirty.get(userId))
  if (data) {
    const notify = (data.notify ?? {}) as Partial<NotifySettings>
    const server: Settings = { ...DEFAULT_SETTINGS, name: data.name ?? '', notify: { ...DEFAULT_SETTINGS.notify, ...notify } }
    const mine = read(userId)
    write(
      userId,
      {
        ...server,
        name: early.has('name') ? mine.name : server.name,
        notify: early.has('notify') ? mine.notify : server.notify,
      },
      false,
    )
  } else {
    // Hesapta henüz yok (ilk giriş): cihazdakini hesaba kaydet
    dirty.set(userId, new Set<Field>(['name', 'notify']))
    listeners.forEach((l) => l())
  }
  if (dirty.get(userId)?.size) enqueue(userId)
}

/** Bağlantı gelince ya da uygulama öne gelince: okunamayan hesap yeniden okunur, gönderilemeyen değişiklik yeniden gider */
function retryAll() {
  for (const userId of watched) {
    if (!synced.has(userId)) void loadRemote(userId)
    else if (dirty.get(userId)?.size) enqueue(userId)
  }
}

let listening = false
function listenForRetry() {
  if (listening) return
  listening = true
  window.addEventListener('online', retryAll)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retryAll()
  })
}

/** Hesaptaki ayarlar okundu mu (test hesabında hep evet) */
export function useSettingsSynced(userId: string) {
  return useSyncExternalStore(subscribe, () => !remote(userId) || synced.has(userId))
}

/** Ayarları okur; update ile bir kısmını değiştirir (bildirim ayarları için updateNotify) */
export function useSettings(userId: string) {
  const settings = useSyncExternalStore(subscribe, () => read(userId))
  useEffect(() => {
    if (!remote(userId)) return
    watched.add(userId)
    listenForRetry()
    void loadRemote(userId)
  }, [userId])
  const update = (patch: Partial<Settings>) => write(userId, { ...read(userId), ...patch })
  const updateNotify = (patch: Partial<NotifySettings>) => {
    const current = read(userId)
    write(userId, { ...current, notify: { ...current.notify, ...patch } })
  }
  return { settings, update, updateNotify }
}

/** Çıkışta bu hesabın ayar kopyasını siler; bekleyen gönderimler ve okuma da iptal edilir. */
export function clearSettingsCache(userId: string) {
  window.clearTimeout(pending.get(userId))
  pending.delete(userId)
  watched.delete(userId)
  loaded.delete(userId)
  synced.delete(userId)
  dirty.delete(userId)
  version.delete(userId)
  cache.delete(userId)
  try {
    localStorage.removeItem(key(userId))
  } catch {
    // erişilemiyorsa yapacak bir şey yok
  }
  listeners.forEach((l) => l())
}

/** "1 gün önce", "Ödeme günü", "3 ve 1 gün önce" */
export function daysLabel(days: ReminderDay[]) {
  if (days.length === 0) return 'Kapalı'
  const sorted = [...days].sort((a, b) => b - a)
  const before = sorted.filter((d) => d > 0)
  const parts: string[] = []
  if (before.length) parts.push(`${before.join(' ve ')} gün önce`)
  if (sorted.includes(0)) parts.push('ödeme günü')
  const text = parts.join(', ')
  return text[0].toLocaleUpperCase('tr') + text.slice(1)
}

/** Ad varsa ad-soyad baş harfleri ("Sadık Ak" → "SA"), yoksa e-postanın ilk harfi */
export function initials(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return (Array.from(email.trim())[0] ?? '?').toLocaleUpperCase('tr')
  return words
    .slice(0, 2)
    .map((w) => Array.from(w)[0])
    .join('')
    .toLocaleUpperCase('tr')
}
