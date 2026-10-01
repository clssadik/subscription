import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CardForm } from '@/components/CardForm'
import { DueBadge } from '@/components/DueBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { monthlyCost, nextMonthlyDay } from '@/lib/dates'
import { formatDate, formatMoney } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { CreditCard } from '@/lib/types'

export function CardsScreen() {
  const { state, dispatch } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CreditCard | undefined>()

  function openForm(card?: CreditCard) {
    setEditing(card)
    setFormOpen(true)
  }

  function remove(card: CreditCard) {
    const linked = state.subscriptions.filter((s) => s.cardId === card.id).length
    const msg = linked
      ? `${card.bankName} •••• ${card.last4} silinsin mi? Bu karta bağlı ${linked} abonelik kartsız kalacak.`
      : `${card.bankName} •••• ${card.last4} silinsin mi?`
    if (!window.confirm(msg)) return
    dispatch({ type: 'card/delete', id: card.id })
    toast.success('Kart silindi')
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kartlar</h1>
        <Button onClick={() => openForm()}><PlusIcon /> Kart ekle</Button>
      </div>

      {state.cards.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">Henüz kart eklemedin.</p>
      )}

      {state.cards.map((card) => {
        const subs = state.subscriptions.filter((s) => s.cardId === card.id && s.currency === 'TRY')
        const monthlyTry = subs.reduce((sum, s) => sum + monthlyCost(s), 0)
        const due = nextMonthlyDay(card.dueDay)
        return (
          <Card key={card.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>{card.bankName}</CardTitle>
                <p className="font-mono text-sm text-muted-foreground">•••• •••• •••• {card.last4}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Düzenle" onClick={() => openForm(card)}><PencilIcon /></Button>
                <Button variant="ghost" size="icon" aria-label="Sil" onClick={() => remove(card)}><Trash2Icon /></Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row label="Limit" value={formatMoney(card.limit)} />
              <Row label="Hesap kesim" value={`Her ayın ${card.statementDay}. günü`} />
              <Row label="Son ödeme" value={`Her ayın ${card.dueDay}. günü`} />
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
                <span>Sıradaki son ödeme: {formatDate(due)}</span>
                <DueBadge date={due} />
              </div>
              {monthlyTry > 0 && (
                <Row label="Bu karttaki aylık TL abonelik" value={formatMoney(monthlyTry)} />
              )}
            </CardContent>
          </Card>
        )
      })}

      <CardForm
        open={formOpen}
        onOpenChange={setFormOpen}
        card={editing}
        onSave={(card) => {
          dispatch({ type: 'card/save', card })
          setFormOpen(false)
          toast.success(editing ? 'Kart güncellendi' : 'Kart eklendi')
        }}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  )
}
