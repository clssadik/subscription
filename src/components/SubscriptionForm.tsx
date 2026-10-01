import { format } from 'date-fns'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parseAmount } from '@/lib/format'
import { newId, useStore } from '@/lib/store'
import { CURRENCIES, CYCLE_LABELS, type BillingCycle, type Currency, type Subscription } from '@/lib/types'

const NO_CARD = 'none'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription?: Subscription
  onSave: (subscription: Subscription) => void
}

export function SubscriptionForm({ open, onOpenChange, subscription, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{subscription ? 'Aboneliği düzenle' : 'Yeni abonelik'}</DialogTitle>
          <DialogDescription>Yenilenme tarihi olarak bilinen herhangi bir ödeme gününü girebilirsin.</DialogDescription>
        </DialogHeader>
        {open && <SubscriptionFormFields key={subscription?.id ?? 'new'} subscription={subscription} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  )
}

function SubscriptionFormFields({
  subscription,
  onSave,
}: {
  subscription?: Subscription
  onSave: (subscription: Subscription) => void
}) {
  const { state } = useStore()
  const [name, setName] = useState(subscription?.name ?? '')
  const [amount, setAmount] = useState(subscription ? String(subscription.amount) : '')
  const [currency, setCurrency] = useState<Currency>(subscription?.currency ?? 'TRY')
  const [cycle, setCycle] = useState<BillingCycle>(subscription?.cycle ?? 'monthly')
  const [renewalDate, setRenewalDate] = useState(() => subscription?.renewalDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [cardId, setCardId] = useState(subscription?.cardId ?? NO_CARD)
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!name.trim()) return setError('Abonelik adını gir.')
    if (!(value > 0)) return setError('Tutarı sayı olarak gir.')
    if (!renewalDate) return setError('Yenilenme tarihini seç.')
    onSave({
      id: subscription?.id ?? newId(),
      name: name.trim(),
      amount: value,
      currency,
      cycle,
      renewalDate,
      cardId: cardId === NO_CARD ? null : cardId,
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Ad</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ör. Netflix" />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-2">
          <Label htmlFor="amount">Tutar</Label>
          <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="229,99" />
        </div>
        <div className="grid gap-2">
          <Label>Para birimi</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Periyot</Label>
          <Select value={cycle} onValueChange={(v) => setCycle(v as BillingCycle)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CYCLE_LABELS).map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="renewal">Yenilenme tarihi</Label>
          <Input id="renewal" type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Ödendiği kart</Label>
        <Select value={cardId} onValueChange={setCardId}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CARD}>Kart seçilmedi</SelectItem>
            {state.cards.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.bankName} •••• {c.last4}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" size="lg" className="w-full">Kaydet</Button>
      </DialogFooter>
    </form>
  )
}
