import { useEffect, useState } from 'react'
import { Logo } from '@/components/Logo'
import { FEATURED_SERVICES } from '@/lib/services'
import { cn } from '@/lib/utils'

// Giriş ekranındaki kutular: birkaç saniyede bir rastgele bir kutunun rengi, şekli ya da logosu değişir.

const COLORS = ['#F4C21B', '#1F4FB4', '#D9381E', '#141414']
const INK = '#141414'
// Bauhaus şekilleri: kemer, çeyrek daireler, yuvarlak, kare
const SHAPES = [
  '35px 35px 12px 12px',
  '12px 12px 35px 35px',
  '12px 35px 12px 12px',
  '35px 12px 12px 12px',
  '12px 12px 12px 35px',
  '12px 12px 35px 12px',
  '35px',
  '12px',
]
const LOGOS = FEATURED_SERVICES.filter((s) => s.icon)
const MAX_LOGOS = 2

interface Tile {
  color: string
  /** Bir önceki renk: yeni renk bunun üstünde ortadan büyüyerek açılır (ara ton oluşmasın) */
  prev: string
  shape: string
  logo: string | null
  /** Her değişimde artar; animasyonu yeniden başlatmak için */
  v: number
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

/** i. kutu için, şimdikinden farklı ve diğer kutularla logo paylaşmayan yeni bir kutu üretir. */
function nextTile(tiles: Tile[], i: number): Tile {
  const current = tiles[i]
  const logosInUse = tiles.filter((_, j) => j !== i).map((t) => t.logo).filter(Boolean)
  const shape = pick(SHAPES.filter((s) => s !== current.shape))
  const base = { prev: current.color, shape, v: current.v + 1 }

  // Ekranda hep en az bir, en fazla iki logo olsun
  if (logosInUse.length === 0 || (logosInUse.length < MAX_LOGOS && Math.random() < 0.35)) {
    const free = LOGOS.filter((s) => s.key !== current.logo && !logosInUse.includes(s.key))
    return { ...base, color: INK, logo: pick(free).key }
  }

  // Yan yana iki kutu aynı renk olmasın (her sırada 3 kutu var)
  const row = i < 3 ? 0 : 3
  const neighbors = [i - 1, i + 1].filter((j) => j >= row && j < row + 3).map((j) => tiles[j].color)
  const colors = COLORS.filter((c) => (c !== current.color || current.logo) && !neighbors.includes(c))
  return { ...base, color: pick(colors.length ? colors : COLORS), logo: null }
}

function initialTiles() {
  let tiles: Tile[] = Array.from({ length: 6 }, () => ({ color: INK, prev: INK, shape: SHAPES[0], logo: null, v: 0 }))
  for (let i = 0; i < 6; i++) tiles = tiles.map((t, j) => (j === i ? nextTile(tiles, i) : t))
  // İlk açılışta animasyon olmasın
  return tiles.map((t) => ({ ...t, prev: t.color, v: 0 }))
}

export function BauhausTiles({ children }: { children: React.ReactNode }) {
  const [tiles, setTiles] = useState(initialTiles)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer: number
    const tick = () => {
      setTiles((prev) => {
        // Çoğu zaman bir, bazen iki kutu birden değişir
        const count = Math.random() < 0.3 ? 2 : 1
        let next = prev
        for (let k = 0; k < count; k++) {
          const i = Math.floor(Math.random() * next.length)
          next = next.map((t, j) => (j === i ? nextTile(next, i) : t))
        }
        return next
      })
      timer = window.setTimeout(tick, 1200 + Math.random() * 1400)
    }
    timer = window.setTimeout(tick, 1500)
    return () => window.clearTimeout(timer)
  }, [])

  const row = (list: Tile[], offset: number) => (
    <div className="grid grid-cols-3 gap-2" aria-hidden>
      {list.map((t, i) => (
        <div
          key={offset + i}
          className={cn(
            'relative flex h-[70px] items-center justify-center overflow-hidden transition-[border-radius] duration-700 ease-out',
            t.color === INK && 'dark:ring-1 dark:ring-white/10',
          )}
          style={{ background: t.prev, borderRadius: t.shape }}
        >
          <span
            key={t.v}
            className={cn('absolute top-1/2 left-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 rounded-full', t.v > 0 && 'bloom')}
            style={{ background: t.color }}
            // Animasyon bitince alttaki eski rengi de güncelle; kenarda ince çizgi kalmasın
            onAnimationEnd={() => setTiles((all) => all.map((x, j) => (j === offset + i ? { ...x, prev: x.color } : x)))}
          />
          {t.logo && (
            <span key={t.logo} className="relative animate-in fade-in zoom-in-75 duration-500">
              <Logo serviceKey={t.logo} name={t.logo} size={44} tile={false} />
            </span>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <>
      {row(tiles.slice(0, 3), 0)}
      {children}
      {row(tiles.slice(3), 3)}
    </>
  )
}
