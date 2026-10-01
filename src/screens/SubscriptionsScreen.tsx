import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DueBadge } from '@/components/DueBadge'
import { SubscriptionForm } from '@/components/SubscriptionForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { nextRenewal } from '@/lib/dates'
import { formatMoney, formatShortDate } from '@/lib/format'
import { useStore } from '@/lib/store'
import { CYCLE_LABELS, type Subscription } from '@/lib/types'

export function SubscriptionsScreen() {
  const { state, dispatch } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | undefined>()

  function openForm(subscription?: Subscription) {
    setEditing(subscription)
    setFormOpen(true)
  }

  function remove(sub: Subscription) {
    if (!window.confirm(`${sub.name} silinsin mi?`)) return
    dispatch({ type: 'subscription/delete', id: sub.id })
    toast.success('Abonelik silindi')
  }

  const sorted = state.subscriptions
    .map((s) => ({ sub: s, next: nextRenewal(s) }))
    .sort((a, b) => a.next.getTime() - b.next.getTime())

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Abonelikler</h1>
        <Button onClick={() => openForm()}><PlusIcon /> Abonelik ekle</Button>
      </div>

      {sorted.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">Henüz abonelik eklemedin.</p>
      )}

      {sorted.map(({ sub, next }) => {
        const card = state.cards.find((c) => c.id === sub.cardId)
        return (
          <Card key={sub.id}>
            <CardContent className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{sub.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMoney(sub.amount, sub.currency)} · {CYCLE_LABELS[sub.cycle]}
                </p>
                <p className="text-sm text-muted-foreground">
                  {card ? `${card.bankName} •••• ${card.last4}` : 'Kart seçilmedi'}
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span>Yenilenme: {formatShortDate(next)}</span>
                  <DueBadge date={next} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" aria-label="Düzenle" onClick={() => openForm(sub)}><PencilIcon /></Button>
                <Button variant="ghost" size="icon" aria-label="Sil" onClick={() => remove(sub)}><Trash2Icon /></Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <SubscriptionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        subscription={editing}
        onSave={(subscription) => {
          dispatch({ type: 'subscription/save', subscription })
          setFormOpen(false)
          toast.success(editing ? 'Abonelik güncellendi' : 'Abonelik eklendi')
        }}
      />
    </div>
  )
}
