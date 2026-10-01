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
import { parseAmount } from '@/lib/format'
import { newId } from '@/lib/store'
import type { CreditCard } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: CreditCard
  onSave: (card: CreditCard) => void
}

export function CardForm({ open, onOpenChange, card, onSave }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{card ? 'Kartı düzenle' : 'Yeni kart'}</DialogTitle>
          <DialogDescription>Kart numarasının tamamını değil, sadece son 4 hanesini gir.</DialogDescription>
        </DialogHeader>
        {/* key: dialog her açıldığında form sıfırdan başlasın */}
        {open && <CardFormFields key={card?.id ?? 'new'} card={card} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  )
}

function CardFormFields({ card, onSave }: { card?: CreditCard; onSave: (card: CreditCard) => void }) {
  const [bankName, setBankName] = useState(card?.bankName ?? '')
  const [last4, setLast4] = useState(card?.last4 ?? '')
  const [statementDay, setStatementDay] = useState(card ? String(card.statementDay) : '')
  const [dueDay, setDueDay] = useState(card ? String(card.dueDay) : '')
  const [limit, setLimit] = useState(card ? String(card.limit) : '')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const sDay = Number(statementDay)
    const dDay = Number(dueDay)
    const lim = parseAmount(limit)
    if (!bankName.trim()) return setError('Banka adını gir.')
    if (!/^\d{4}$/.test(last4)) return setError('Son 4 hane tam 4 rakam olmalı.')
    if (!Number.isInteger(sDay) || sDay < 1 || sDay > 31) return setError('Hesap kesim günü 1-31 arası olmalı.')
    if (!Number.isInteger(dDay) || dDay < 1 || dDay > 31) return setError('Son ödeme günü 1-31 arası olmalı.')
    if (!(lim >= 0)) return setError('Limiti sayı olarak gir.')
    onSave({
      id: card?.id ?? newId(),
      bankName: bankName.trim(),
      last4,
      statementDay: sDay,
      dueDay: dDay,
      limit: lim,
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="bank">Banka</Label>
        <Input id="bank" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ör. Garanti BBVA" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="last4">Son 4 hane</Label>
        <Input
          id="last4"
          inputMode="numeric"
          maxLength={4}
          value={last4}
          onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="1234"
          autoComplete="off"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="statement">Hesap kesim günü</Label>
          <Input id="statement" inputMode="numeric" value={statementDay} onChange={(e) => setStatementDay(e.target.value.replace(/\D/g, ''))} placeholder="15" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="due">Son ödeme günü</Label>
          <Input id="due" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/\D/g, ''))} placeholder="25" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="limit">Limit (₺)</Label>
        <Input id="limit" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="50000" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" size="lg" className="w-full">Kaydet</Button>
      </DialogFooter>
    </form>
  )
}
