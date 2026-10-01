import {
  siAudible,
  siClaude,
  siDeezer,
  siDiscord,
  siDropbox,
  siDuolingo,
  siFigma,
  siGithub,
  siGooglegemini,
  siHbomax,
  siIcloud,
  siMubi,
  siNetflix,
  siNotion,
  siPlaystation,
  siSpotify,
  siTidal,
  siTwitch,
  siYoutube,
  type SimpleIcon,
} from 'simple-icons'

// Hazır servis listesi. Logo iki yerden gelir:
// 1) simple-icons paketi (uygulamanın içine gömülü, internetsiz çalışır)
// 2) src/assets/logos/<anahtar>.svg — pakette olmayanlar için elle eklenen logolar
// İkisinde de yoksa servis harfli ikonla görünür ve "eksik logo" olarak not alınır.

export interface Service {
  key: string
  name: string
  /** Logo yokken harfli ikonun zemin rengi */
  color: string
  icon?: SimpleIcon
}

export const SERVICES: Service[] = [
  { key: 'netflix', name: 'Netflix', color: '#E50914', icon: siNetflix },
  { key: 'spotify', name: 'Spotify', color: '#1ED760', icon: siSpotify },
  { key: 'youtube', name: 'YouTube Premium', color: '#FF0000', icon: siYoutube },
  { key: 'icloud', name: 'iCloud+', color: '#3693F3', icon: siIcloud },
  { key: 'disney', name: 'Disney+', color: '#0E2C8E' },
  { key: 'primevideo', name: 'Prime Video', color: '#1F2E3E' },
  { key: 'appletv', name: 'Apple TV+', color: '#000000' },
  { key: 'applemusic', name: 'Apple Music', color: '#FA243C' },
  { key: 'hbomax', name: 'HBO Max', color: '#002BE7', icon: siHbomax },
  { key: 'exxen', name: 'Exxen', color: '#F2A900' },
  { key: 'blutv', name: 'BluTV', color: '#0091FF' },
  { key: 'gain', name: 'Gain', color: '#FF2D55' },
  { key: 'tod', name: 'TOD', color: '#6A1B9A' },
  { key: 'tabii', name: 'tabii', color: '#00B2A9' },
  { key: 'mubi', name: 'MUBI', color: '#001489', icon: siMubi },
  { key: 'chatgpt', name: 'ChatGPT Plus', color: '#10A37F' },
  { key: 'claude', name: 'Claude', color: '#D97757', icon: siClaude },
  { key: 'gemini', name: 'Google Gemini', color: '#8E75B2', icon: siGooglegemini },
  { key: 'googleone', name: 'Google One', color: '#4285F4' },
  { key: 'microsoft365', name: 'Microsoft 365', color: '#D83B01' },
  { key: 'adobe', name: 'Adobe Creative Cloud', color: '#DA1F26' },
  { key: 'notion', name: 'Notion', color: '#000000', icon: siNotion },
  { key: 'figma', name: 'Figma', color: '#F24E1E', icon: siFigma },
  { key: 'github', name: 'GitHub', color: '#181717', icon: siGithub },
  { key: 'dropbox', name: 'Dropbox', color: '#0061FF', icon: siDropbox },
  { key: 'duolingo', name: 'Duolingo', color: '#58CC02', icon: siDuolingo },
  { key: 'playstation', name: 'PlayStation Plus', color: '#0070D1', icon: siPlaystation },
  { key: 'xbox', name: 'Xbox Game Pass', color: '#107C10' },
  { key: 'discord', name: 'Discord Nitro', color: '#5865F2', icon: siDiscord },
  { key: 'twitch', name: 'Twitch', color: '#9146FF', icon: siTwitch },
  { key: 'tidal', name: 'TIDAL', color: '#000000', icon: siTidal },
  { key: 'deezer', name: 'Deezer', color: '#A238FF', icon: siDeezer },
  { key: 'audible', name: 'Audible', color: '#F8991C', icon: siAudible },
  { key: 'storytel', name: 'Storytel', color: '#FF5C28' },
]

// Elle eklenen logolar: src/assets/logos/netflix.svg gibi. Dosya adı = servis anahtarı.
const localLogos = import.meta.glob('../assets/logos/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function localLogoUrl(key: string) {
  return localLogos[`../assets/logos/${key}.svg`]
}

export function getService(key: string | null | undefined) {
  return key ? SERVICES.find((s) => s.key === key) : undefined
}

export type LogoSource =
  | { type: 'icon'; path: string; color: string }
  | { type: 'image'; url: string }
  | { type: 'letter'; letter: string; color: string }

/** Bir abonelik için ekranda ne gösterileceğini söyler. */
export function logoFor(serviceKey: string | null, name: string): LogoSource {
  const service = getService(serviceKey)
  if (service) {
    const url = localLogoUrl(service.key)
    if (url) return { type: 'image', url }
    if (service.icon) return { type: 'icon', path: service.icon.path, color: `#${service.icon.hex}` }
  }
  return {
    type: 'letter',
    letter: (name.trim()[0] ?? '?').toLocaleUpperCase('tr'),
    color: service?.color ?? colorFromName(name),
  }
}

export function hasLogo(serviceKey: string | null) {
  const service = getService(serviceKey)
  return !!service && (!!service.icon || !!localLogoUrl(service.key))
}

/** Servisin "marka rengi": toplam çubuğu gibi yerlerde kullanılır */
export function serviceColor(serviceKey: string | null, name: string) {
  const service = getService(serviceKey)
  if (service?.icon && service.icon.hex !== '000000') return `#${service.icon.hex}`
  return service?.color ?? colorFromName(name)
}

/** Yazılan adı listedeki bir servisle eşleştirir ("netflix" → Netflix) */
export function matchService(name: string) {
  const n = normalize(name)
  if (!n) return undefined
  return SERVICES.find((s) => normalize(s.name) === n || s.key === n)
}

export function normalize(s: string) {
  return s.toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]/g, '')
}

const FALLBACK = ['#1F4FB4', '#D9381E', '#B8860B', '#0B7A43', '#6A1B9A', '#00838F', '#AD1457']
function colorFromName(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK[h % FALLBACK.length]
}
