import { Badge } from '@/components/ui/badge'
import { daysUntil } from '@/lib/dates'

/** "Bugün", "Yarın", "5 gün" gibi kalan süre etiketi. 3 gün ve altı kırmızı. */
export function DueBadge({ date }: { date: Date }) {
  const days = daysUntil(date)
  const text = days === 0 ? 'Bugün' : days === 1 ? 'Yarın' : `${days} gün`
  return <Badge variant={days <= 3 ? 'destructive' : 'secondary'}>{text}</Badge>
}
