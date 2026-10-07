import {
  si1password,
  siApple,
  siApplearcade,
  siApplemusic,
  siAppletv,
  siAudible,
  siBackblaze,
  siBitwarden,
  siClaude,
  siCloudflare,
  siCodecademy,
  siCoursera,
  siCrunchyroll,
  siCursor,
  siDashlane,
  siDeezer,
  siDigitalocean,
  siDiscord,
  siDropbox,
  siDuolingo,
  siEa,
  siElevenlabs,
  siEvernote,
  siExpressvpn,
  siFigma,
  siFitbit,
  siFramer,
  siGithub,
  siGithubcopilot,
  siGodaddy,
  siGooglegemini,
  siGrammarly,
  siHbomax,
  siHeadspace,
  siHetzner,
  siHumblebundle,
  siIcloud,
  siJetbrains,
  siLastpass,
  siMedium,
  siMega,
  siMiro,
  siMubi,
  siMullvad,
  siNamecheap,
  siNetflix,
  siNewyorktimes,
  siNordvpn,
  siNotion,
  siNvidia,
  siObsidian,
  siParamountplus,
  siPatreon,
  siPeloton,
  siPerplexity,
  siPlaystation,
  siPocketcasts,
  siProton,
  siRaycast,
  siReplit,
  siRoblox,
  siShopify,
  siSkillshare,
  siSoundcloud,
  siSpotify,
  siStrava,
  siSubstack,
  siSuno,
  siSurfshark,
  siTelegram,
  siTicktick,
  siTidal,
  siTinder,
  siTodoist,
  siTrello,
  siTwitch,
  siUber,
  siUbisoft,
  siUdemy,
  siVercel,
  siVodafone,
  siWattpad,
  siWebflow,
  siWix,
  siX,
  siYoutube,
  siYoutubemusic,
  siYoutubetv,
  siZoom,
  type SimpleIcon,
} from 'simple-icons'
import { colorFromName } from './color'
import { fold } from './text'

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

// Öne çıkanlar: giriş ekranındaki kutularda ve boş ekrandaki ızgarada bunlar kullanılır
export const FEATURED_SERVICES: Service[] = [
  { key: 'netflix', name: 'Netflix', color: '#E50914', icon: siNetflix },
  { key: 'spotify', name: 'Spotify', color: '#1ED760', icon: siSpotify },
  { key: 'youtube', name: 'YouTube Premium', color: '#FF0000', icon: siYoutube },
  { key: 'icloud', name: 'iCloud+', color: '#3693F3', icon: siIcloud },
  { key: 'disney', name: 'Disney+', color: '#0E2C8E' },
  { key: 'primevideo', name: 'Prime Video', color: '#1F2E3E' },
  { key: 'appletv', name: 'Apple TV+', color: '#000000', icon: siAppletv },
  { key: 'applemusic', name: 'Apple Music', color: '#FA243C', icon: siApplemusic },
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


// Diğer servisler: ad yazarken öneri olarak çıkar
const MORE_SERVICES: Service[] = [
  // Video ve TV
  { key: 'amazonprime', name: 'Amazon Prime', color: '#00A8E1' },
  { key: 'paramountplus', name: 'Paramount+', color: '#0064FF', icon: siParamountplus },
  { key: 'crunchyroll', name: 'Crunchyroll', color: '#FF5E00', icon: siCrunchyroll },
  { key: 'beinconnect', name: 'beIN CONNECT', color: '#5C2D91' },
  { key: 'ssportplus', name: 'S Sport Plus', color: '#E30613' },
  { key: 'tvplus', name: 'TV+', color: '#FFC72C' },
  { key: 'tivibu', name: 'Tivibu', color: '#00A0DF' },
  { key: 'dsmartgo', name: 'D-Smart GO', color: '#E2001A' },
  { key: 'dazn', name: 'DAZN', color: '#0C161C' },
  { key: 'youtubetv', name: 'YouTube TV', color: '#FF0000', icon: siYoutubetv },
  // Müzik, kitap, podcast
  { key: 'youtubemusic', name: 'YouTube Music', color: '#FF0000', icon: siYoutubemusic },
  { key: 'fizy', name: 'fizy', color: '#FFC72C' },
  { key: 'muud', name: 'Muud', color: '#7A2BF5' },
  { key: 'amazonmusic', name: 'Amazon Music', color: '#25D1DA' },
  { key: 'soundcloud', name: 'SoundCloud Go', color: '#FF5500', icon: siSoundcloud },
  { key: 'kindle', name: 'Kindle Unlimited', color: '#FF9900' },
  { key: 'scribd', name: 'Scribd', color: '#1A7BBA' },
  { key: 'blinkist', name: 'Blinkist', color: '#2CE080' },
  { key: 'medium', name: 'Medium', color: '#000000', icon: siMedium },
  { key: 'wattpad', name: 'Wattpad', color: '#FF500A', icon: siWattpad },
  { key: 'pocketcasts', name: 'Pocket Casts', color: '#F43E37', icon: siPocketcasts },
  { key: 'nytimes', name: 'The New York Times', color: '#000000', icon: siNewyorktimes },
  // Apple
  { key: 'appleone', name: 'Apple One', color: '#000000', icon: siApple },
  { key: 'applearcade', name: 'Apple Arcade', color: '#000000', icon: siApplearcade },
  // Yapay zekâ
  { key: 'perplexity', name: 'Perplexity Pro', color: '#1FB8CD', icon: siPerplexity },
  { key: 'copilot', name: 'GitHub Copilot', color: '#000000', icon: siGithubcopilot },
  { key: 'cursor', name: 'Cursor', color: '#000000', icon: siCursor },
  { key: 'midjourney', name: 'Midjourney', color: '#000000' },
  { key: 'xpremium', name: 'X Premium', color: '#000000', icon: siX },
  { key: 'elevenlabs', name: 'ElevenLabs', color: '#000000', icon: siElevenlabs },
  { key: 'suno', name: 'Suno', color: '#000000', icon: siSuno },
  // Üretkenlik ve iş
  { key: 'canva', name: 'Canva', color: '#00C4CC' },
  { key: 'grammarly', name: 'Grammarly', color: '#027E6F', icon: siGrammarly },
  { key: 'evernote', name: 'Evernote', color: '#00A82D', icon: siEvernote },
  { key: 'todoist', name: 'Todoist', color: '#E44332', icon: siTodoist },
  { key: 'ticktick', name: 'TickTick', color: '#4772FA', icon: siTicktick },
  { key: 'obsidian', name: 'Obsidian', color: '#7C3AED', icon: siObsidian },
  { key: 'raycast', name: 'Raycast', color: '#FF6363', icon: siRaycast },
  { key: 'setapp', name: 'Setapp', color: '#E6C3A5' },
  { key: 'googleworkspace', name: 'Google Workspace', color: '#4285F4' },
  { key: 'zoom', name: 'Zoom', color: '#0B5CFF', icon: siZoom },
  { key: 'slack', name: 'Slack', color: '#4A154B' },
  { key: 'linkedin', name: 'LinkedIn Premium', color: '#0A66C2' },
  { key: 'miro', name: 'Miro', color: '#050038', icon: siMiro },
  { key: 'trello', name: 'Trello', color: '#0052CC', icon: siTrello },
  { key: 'framer', name: 'Framer', color: '#0055FF', icon: siFramer },
  { key: 'webflow', name: 'Webflow', color: '#146EF5', icon: siWebflow },
  { key: 'wix', name: 'Wix', color: '#0C6EFC', icon: siWix },
  { key: 'shopify', name: 'Shopify', color: '#7AB55C', icon: siShopify },
  { key: 'jetbrains', name: 'JetBrains', color: '#000000', icon: siJetbrains },
  { key: 'replit', name: 'Replit', color: '#F26207', icon: siReplit },
  // Güvenlik ve VPN
  { key: '1password', name: '1Password', color: '#145FE4', icon: si1password },
  { key: 'bitwarden', name: 'Bitwarden', color: '#175DDC', icon: siBitwarden },
  { key: 'lastpass', name: 'LastPass', color: '#D32D27', icon: siLastpass },
  { key: 'dashlane', name: 'Dashlane', color: '#0E353D', icon: siDashlane },
  { key: 'nordvpn', name: 'NordVPN', color: '#4687FF', icon: siNordvpn },
  { key: 'expressvpn', name: 'ExpressVPN', color: '#DA3940', icon: siExpressvpn },
  { key: 'surfshark', name: 'Surfshark', color: '#1EBFBF', icon: siSurfshark },
  { key: 'proton', name: 'Proton', color: '#6D4AFF', icon: siProton },
  { key: 'mullvad', name: 'Mullvad VPN', color: '#294D73', icon: siMullvad },
  // Bulut, alan adı, sunucu
  { key: 'mega', name: 'MEGA', color: '#D9272E', icon: siMega },
  { key: 'backblaze', name: 'Backblaze', color: '#E21E29', icon: siBackblaze },
  { key: 'cloudflare', name: 'Cloudflare', color: '#F38020', icon: siCloudflare },
  { key: 'godaddy', name: 'GoDaddy', color: '#1BDBDB', icon: siGodaddy },
  { key: 'namecheap', name: 'Namecheap', color: '#DE3723', icon: siNamecheap },
  { key: 'vercel', name: 'Vercel', color: '#000000', icon: siVercel },
  { key: 'digitalocean', name: 'DigitalOcean', color: '#0080FF', icon: siDigitalocean },
  { key: 'hetzner', name: 'Hetzner', color: '#D50C2D', icon: siHetzner },
  // Sosyal ve içerik
  { key: 'telegram', name: 'Telegram Premium', color: '#26A5E4', icon: siTelegram },
  { key: 'snapchat', name: 'Snapchat+', color: '#FFFC00' },
  { key: 'patreon', name: 'Patreon', color: '#000000', icon: siPatreon },
  { key: 'substack', name: 'Substack', color: '#FF6719', icon: siSubstack },
  { key: 'tinder', name: 'Tinder', color: '#FF6B6B', icon: siTinder },
  { key: 'bumble', name: 'Bumble', color: '#FFC629' },
  // Spor ve sağlık
  { key: 'strava', name: 'Strava', color: '#FC4C02', icon: siStrava },
  { key: 'headspace', name: 'Headspace', color: '#F47D31', icon: siHeadspace },
  { key: 'calm', name: 'Calm', color: '#4B7BEC' },
  { key: 'peloton', name: 'Peloton', color: '#181A1D', icon: siPeloton },
  { key: 'myfitnesspal', name: 'MyFitnessPal', color: '#0072BC' },
  { key: 'fitbit', name: 'Fitbit Premium', color: '#00B0B9', icon: siFitbit },
  { key: 'macfit', name: 'MACFit', color: '#E30613' },
  // Alışveriş ve ulaşım
  { key: 'hepsiburada', name: 'Hepsiburada Premium', color: '#FF6000' },
  { key: 'uberone', name: 'Uber One', color: '#000000', icon: siUber },
  // Oyun
  { key: 'nintendo', name: 'Nintendo Switch Online', color: '#E60012' },
  { key: 'eaplay', name: 'EA Play', color: '#000000', icon: siEa },
  { key: 'ubisoft', name: 'Ubisoft+', color: '#000000', icon: siUbisoft },
  { key: 'geforcenow', name: 'GeForce NOW', color: '#76B900', icon: siNvidia },
  { key: 'roblox', name: 'Roblox Premium', color: '#000000', icon: siRoblox },
  { key: 'humble', name: 'Humble Choice', color: '#CC2929', icon: siHumblebundle },
  // Telefon ve internet
  { key: 'turkcell', name: 'Turkcell', color: '#FFC72C' },
  { key: 'vodafone', name: 'Vodafone', color: '#E60000', icon: siVodafone },
  { key: 'turktelekom', name: 'Türk Telekom', color: '#0066B3' },
  { key: 'superonline', name: 'Turkcell Superonline', color: '#FFC72C' },
  { key: 'turknet', name: 'TurkNet', color: '#FF6600' },
  // Eğitim
  { key: 'coursera', name: 'Coursera Plus', color: '#0056D2', icon: siCoursera },
  { key: 'udemy', name: 'Udemy', color: '#A435F0', icon: siUdemy },
  { key: 'babbel', name: 'Babbel', color: '#FF6400' },
  { key: 'cambly', name: 'Cambly', color: '#FFD800' },
  { key: 'codecademy', name: 'Codecademy', color: '#1F4056', icon: siCodecademy },
  { key: 'skillshare', name: 'Skillshare', color: '#00FF84', icon: siSkillshare },
  { key: 'masterclass', name: 'MasterClass', color: '#000000' },
]

export const SERVICES: Service[] = [...FEATURED_SERVICES, ...MORE_SERVICES]

// Elle eklenen logolar: src/assets/logos/netflix.svg gibi. Dosya adı = servis anahtarı.
const localLogos = import.meta.glob('../assets/logos/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

// Beyaz çizilmiş logoların koyu kopyaları: koyu temada logo kutusu beyaz olduğunda kullanılır
const onLightLogos = import.meta.glob('../assets/logos/on-light/*.svg', {
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
  | { type: 'image'; url: string; onLight?: string }
  | { type: 'letter'; letter: string; color: string }

/** Bir abonelik için ekranda ne gösterileceğini söyler. */
export function logoFor(serviceKey: string | null, name: string): LogoSource {
  const service = getService(serviceKey)
  if (service) {
    const url = localLogoUrl(service.key)
    if (url) return { type: 'image', url, onLight: onLightLogos[`../assets/logos/on-light/${service.key}.svg`] }
    if (service.icon) return { type: 'icon', path: service.icon.path, color: `#${service.icon.hex}` }
  }
  return {
    type: 'letter',
    // Array.from: emoji ile başlayan adda yarım karakter kalmasın
    letter: (Array.from(name.trim())[0] ?? '?').toLocaleUpperCase('tr'),
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

/** Arama ve eşleştirme için sade yazım, boşluksuz: "NETFLİX" → "netflix", "HBO Max" ve "hbomax" aynı */
export function normalize(s: string) {
  return fold(s).replace(/ /g, '')
}

