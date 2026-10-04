import { useEffect, useState } from 'react'
import { Logo } from '@/components/Logo'
import { luminance } from '@/lib/color'
import { FEATURED_SERVICES, type Service } from '@/lib/services'
import { cn } from '@/lib/utils'

// Giriş ekranındaki logo duvarı: 3x3 kutu, her biri bir servisin kendi renginde ve logolu.
// Yaklaşık her saniye 2-3 rastgele kutu, kısa arayla sırayla başka bir servise döner: yeni renk ortadan daire olarak büyür, şekil de değişir.

// Bauhaus şekilleri: kemer, çeyrek daireler, yuvarlak, kare
const SHAPES = [
  '30px 30px 12px 12px',
  '12px 12px 30px 30px',
  '12px 30px 12px 12px',
  '30px 12px 12px 12px',
  '12px 12px 12px 30px',
  '12px 12px 30px 12px',
  '30px',
  '12px',
]
const LOGOS = FEATURED_SERVICES.filter((s) => s.icon)
const COUNT = 9

interface Tile {
  key: string
  color: string
  /** Bir önceki renk: yeni renk bunun üstünde ortadan büyüyerek açılır (ara ton oluşmasın) */
  prev: string
  shape: string
  /** Her değişimde artar; animasyonu yeniden başlatmak için */
  v: number
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

/** Kutunun zemini: markanın rengi; siyah markalar (GitHub, Notion, TIDAL) koyu zeminde kaybolmasın diye açık gri */
function tileColor(s: Service) {
  const hex = `#${s.icon!.hex}`
  return luminance(hex) < 0.15 ? '#F2F2F2' : hex
}

/** i. kutu için: ekrandaki diğer servislerden farklı, yan komşularıyla aynı renkte olmayan yeni bir servis */
function nextTile(tiles: Tile[], i: number): Tile {
  const current = tiles[i]
  const inUse = tiles.map((t) => t.key)
  const col = i % 3
  const neighbors = [col > 0 ? i - 1 : -1, col < 2 ? i + 1 : -1, i - 3, i + 3].filter((j) => j >= 0 && j < tiles.length).map((j) => tiles[j].color)
  const free = LOGOS.filter((s) => !inUse.includes(s.key))
  const fit = free.filter((s) => !neighbors.includes(tileColor(s)))
  const s = pick(fit.length ? fit : free)
  return { key: s.key, color: tileColor(s), prev: current.color, shape: pick(SHAPES.filter((x) => x !== current.shape)), v: current.v + 1 }
}

function initialTiles() {
  let tiles: Tile[] = Array.from({ length: COUNT }, (_, i) => ({ key: `empty-${i}`, color: '', prev: '', shape: SHAPES[i % SHAPES.length], v: 0 }))
  for (let i = 0; i < COUNT; i++) tiles = tiles.map((t, j) => (j === i ? nextTile(tiles, i) : t))
  // İlk açılışta animasyon olmasın
  return tiles.map((t) => ({ ...t, prev: t.color, v: 0 }))
}

export function LogoWall() {
  const [tiles, setTiles] = useState(initialTiles)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer: number
    const swaps: number[] = []
    const tick = () => {
      // 2 ya da 3 farklı kutu, aralarında 140ms ile
      const order = [...Array(COUNT).keys()].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2))
      order.forEach((i, k) => {
        swaps.push(window.setTimeout(() => setTiles((prev) => prev.map((t, j) => (j === i ? nextTile(prev, i) : t))), k * 140))
      })
      timer = window.setTimeout(tick, 1000 + Math.random() * 500)
    }
    timer = window.setTimeout(tick, 900)
    return () => {
      window.clearTimeout(timer)
      swaps.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  return (
    <div className="grid grid-cols-3 gap-2" aria-hidden>
      {tiles.map((t, i) => (
        <div
          key={i}
          className="relative flex h-[clamp(68px,13svh,116px)] items-center justify-center overflow-hidden transition-[border-radius] duration-500 ease-out"
          style={{ background: t.prev, borderRadius: t.shape }}
        >
          <span
            key={t.v}
            className={cn('absolute top-1/2 left-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2 rounded-full', t.v > 0 && 'bloom')}
            style={{ background: t.color }}
            // Animasyon bitince alttaki eski rengi de güncelle; kenarda ince çizgi kalmasın
            onAnimationEnd={() => setTiles((all) => all.map((x, j) => (j === i ? { ...x, prev: x.color } : x)))}
          />
          <span key={t.key} className="relative animate-in fade-in zoom-in-75 duration-300">
            <Logo serviceKey={t.key} name={t.key} size={46} tile={false} color={luminance(t.color) > 0.55 ? '#141414' : '#FFFFFF'} />
          </span>
        </div>
      ))}
    </div>
  )
}
