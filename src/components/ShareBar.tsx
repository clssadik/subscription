import { luminance } from '@/lib/color'
import { monthlyCost } from '@/lib/dates'
import { serviceColor } from '@/lib/services'
import type { Subscription } from '@/lib/types'

/** Aylık TL maliyetinde her servisin payını kendi renginde gösteren çubuk. */
export function ShareBar({ subscriptions, height = 8 }: { subscriptions: Subscription[]; height?: number }) {
  const items = subscriptions
    .filter((s) => s.currency === 'TRY')
    .map((s) => ({ id: s.id, value: monthlyCost(s), color: serviceColor(s.serviceKey, s.name) }))
    // Siyah markalar (Notion, GitHub) koyu kartın içinde kaybolmasın: çubuğun bulunduğu kartın yazı rengini al
    .map((i) => (luminance(i.color) < 0.2 ? { ...i, color: 'currentColor' } : i))
    .sort((a, b) => b.value - a.value)
  if (items.length === 0) return <div className="rounded-full bg-line" style={{ height }} />
  return (
    <div className="flex gap-[3px]" role="img" aria-label="Aboneliklerin aylık maliyetteki payları">
      {items.map((i) => (
        <div key={i.id} className="rounded-full" style={{ flex: i.value, height, background: i.color }} />
      ))}
    </div>
  )
}
