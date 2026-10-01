import { CreditCardIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/Logo'
import { BANKS } from '@/lib/banks'
import { SERVICES, getService, normalize, serviceColor } from '@/lib/services'
import { cn } from '@/lib/utils'
import type { Nav } from '@/App'

// Boş ekranlardaki "hızlı başlangıç": servis ya da bankaya dokununca form onunla dolu açılır.

const SHAPES = [
  'rounded-[50px_50px_14px_14px]',
  'rounded-[14px]',
  'rounded-[14px_50px_14px_14px]',
  'rounded-full',
  'rounded-[14px_14px_14px_50px]',
  'rounded-[14px]',
  'rounded-[50px_14px_14px_14px]',
  'rounded-[14px_14px_50px_14px]',
  'rounded-[14px]',
]
const INK_TILE = 'bg-[#141414] dark:bg-surface dark:ring-1 dark:ring-white/10'
// Mozaikte ilk görünenler: Türkiye'de en yaygın, logosu olan servisler
const POPULAR = ['netflix', 'spotify', 'youtube', 'icloud', 'hbomax', 'playstation', 'claude', 'gemini', 'duolingo']
  .map((k) => SERVICES.find((s) => s.key === k)!)

/** Logolu servislerden Bauhaus şekilli 3×3 mozaik */
export function ServiceMosaic({ nav, services = POPULAR }: { nav: Nav; services?: typeof SERVICES }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {services.map((s, i) => (
        <button
          key={s.key}
          onClick={() => nav.add({ serviceKey: s.key })}
          aria-label={`${s.name} ekle`}
          className={cn('pressable flex aspect-square items-center justify-center', INK_TILE, SHAPES[i % SHAPES.length])}
        >
          <Logo serviceKey={s.key} name={s.name} size={62} className="bg-transparent" />
        </button>
      ))}
    </div>
  )
}

// Özet ekranındaki bento: kutular farklı boyda ve her biri servisin kendi renginde
const BENTO: { key: string; cls: string; glyph: number; fg: string; name?: boolean }[] = [
  { key: 'netflix', cls: 'col-span-2 row-span-2 rounded-[90px_90px_18px_18px]', glyph: 52, fg: '#fff', name: true },
  { key: 'spotify', cls: 'col-span-2 rounded-[18px]', glyph: 34, fg: '#000' },
  { key: 'youtube', cls: 'rounded-[18px_40px_18px_18px]', glyph: 30, fg: '#fff' },
  { key: 'icloud', cls: 'rounded-full', glyph: 30, fg: '#fff' },
  { key: 'claude', cls: 'rounded-[18px]', glyph: 30, fg: '#fff' },
  { key: 'playstation', cls: 'rounded-[40px_18px_18px_18px]', glyph: 30, fg: '#fff' },
  { key: 'hbomax', cls: 'col-span-2 rounded-[18px_18px_44px_18px]', glyph: 40, fg: '#fff' },
  { key: 'gemini', cls: 'col-span-2 rounded-[18px_18px_18px_44px]', glyph: 32, fg: '#fff' },
  { key: 'duolingo', cls: 'col-span-2 rounded-[18px]', glyph: 34, fg: '#fff' },
]

/** Özet ekranı boşken */
export function HomeQuickStart({ nav }: { nav: Nav }) {
  return (
    <>
      <p className="label mb-2 px-1 text-subtle">İlk aboneliğini seç</p>
      <div className="grid auto-rows-[78px] grid-cols-4 gap-2">
        {BENTO.map((b) => {
          const s = getService(b.key)!
          return (
            <button
              key={b.key}
              onClick={() => nav.add({ serviceKey: b.key })}
              aria-label={`${s.name} ekle`}
              className={cn('pressable flex flex-col items-center justify-center gap-2', b.cls)}
              style={{ background: serviceColor(s.key, s.name) }}
            >
              <Logo serviceKey={s.key} name={s.name} size={Math.round(b.glyph / 0.55)} color={b.fg} className="bg-transparent" />
              {b.name && <span className="text-base font-medium" style={{ color: b.fg }}>{s.name}</span>}
            </button>
          )
        })}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={() => nav.add()} className="pressable flex min-h-14 items-center justify-center gap-2 rounded-[14px] bg-bh-blue font-medium text-white">
          <PlusIcon className="size-4" /> Abonelik ekle
        </button>
        <button onClick={() => nav.addCard()} className="pressable flex min-h-14 items-center justify-center gap-2 rounded-[14px_14px_14px_40px] bg-bh-red font-medium text-white">
          <CreditCardIcon className="size-4" /> Kart ekle
        </button>
      </div>
    </>
  )
}

/** Abonelikler ekranı boşken: arama + mozaik; aranan listede yoksa adıyla eklenir */
export function SubscriptionQuickStart({ nav }: { nav: Nav }) {
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)
  const q = normalize(query)
  const list = q ? SERVICES.filter((s) => normalize(s.name).includes(q)) : all ? [...POPULAR, ...SERVICES.filter((s) => !POPULAR.includes(s))] : POPULAR

  return (
    <>
      <label className="mb-2.5 flex min-h-11 items-center gap-2 rounded-[14px] bg-surface px-3 text-subtle">
        <SearchIcon className="size-4 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Servis ara"
          aria-label="Servis ara"
          className="w-full bg-transparent text-base text-ink outline-none placeholder:text-subtle"
        />
      </label>
      <ServiceMosaic nav={nav} services={list} />
      {q && (
        <button
          onClick={() => nav.add({ name: query.trim() })}
          className="pressable mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-bh-yellow font-medium text-[#141414]"
        >
          <PlusIcon className="size-4" /> “{query.trim()}” ekle
        </button>
      )}
      {!q && !all && (
        <button onClick={() => setAll(true)} className="mt-2 min-h-11 w-full font-medium text-bh-yellow">Tümünü gör</button>
      )}
    </>
  )
}

const BANK_SHAPES = [
  'rounded-[14px_40px_14px_14px]',
  'rounded-[14px]',
  'rounded-[14px]',
  'rounded-[40px_14px_14px_14px]',
  'rounded-[14px_14px_14px_40px]',
  'rounded-[14px]',
  'rounded-[14px]',
  'rounded-[14px_14px_40px_14px]',
]

/** Kartlar ekranı boşken: bankalar kendi renklerinde */
export function CardQuickStart({ nav }: { nav: Nav }) {
  return (
    <>
      <p className="label mb-2 px-1 text-subtle">Bankanı seç</p>
      <div className="grid grid-cols-2 gap-2">
        {BANKS.slice(0, 7).map((b, i) => (
          <button
            key={b.name}
            onClick={() => nav.addCard(b.name)}
            className={cn('pressable flex h-[62px] items-end p-2.5 text-left text-[13px] font-medium text-white', BANK_SHAPES[i])}
            style={{ background: b.color }}
          >
            {b.name}
          </button>
        ))}
        <button onClick={() => nav.addCard()} className={cn('pressable flex h-[62px] items-end justify-between bg-surface p-2.5 text-left text-[13px] font-medium', BANK_SHAPES[7])}>
          Diğer <PlusIcon className="size-4 text-subtle" />
        </button>
      </div>
    </>
  )
}
