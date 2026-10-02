import { format } from 'date-fns'
import { CreditCardIcon, RepeatIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DaySelect, Field, FieldGroup, inputClass, PrimaryButton, Segmented, selectClass } from '@/components/FormBits'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { bankColor, bankName as fullBankName, cardColor } from '@/lib/banks'
import { parseAmount } from '@/lib/format'
import { getService, matchService } from '@/lib/services'
import { newId, useStore } from '@/lib/store'
import { useUndoable } from '@/lib/undo'
import { CURRENCIES, type BillingCycle, type CardKind, type CreditCard, type Currency, type Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Açılacak form. id varsa düzenleme; serviceKey/name/bankName yeni kayıtta hazır seçili gelir. */
export type SheetTarget = { kind: 'subscription' | 'card'; id?: string; serviceKey?: string; name?: string; bankName?: string } | null

/** "+" ile ya da düzenle ile açılan alt panel */
export function AddSheet({ target, onClose }: { target: SheetTarget; onClose: () => void }) {
  const [kind, setKind] = useState<'subscription' | 'card'>(target?.kind ?? 'subscription')
  const [lastTarget, setLastTarget] = useState(target)
  // Panel her açıldığında türü hedefe göre sıfırla
  if (target !== lastTarget) {
    setLastTarget(target)
    if (target) setKind(target.kind)
  }
  const editing = !!target?.id

  return (
    <Drawer open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[94svh] rounded-t-[30px] border-0 bg-page data-[vaul-drawer-direction=bottom]:max-h-[94svh]">
        <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DrawerTitle className="num pt-3 pb-1 text-center text-lg font-medium">
            {editing ? (kind === 'card' ? 'Kartı düzenle' : 'Aboneliği düzenle') : 'Yeni ekle'}
          </DrawerTitle>
          <DrawerDescription className="sr-only">Abonelik ya da kart bilgilerini gir.</DrawerDescription>

          {!editing && (
            <div className="mt-3 flex gap-2">
              <KindButton active={kind === 'subscription'} onClick={() => setKind('subscription')}>
                <RepeatIcon className="size-5" /> Abonelik
              </KindButton>
              <KindButton active={kind === 'card'} onClick={() => setKind('card')}>
                <CreditCardIcon className="size-5" /> Kart
              </KindButton>
            </div>
          )}

          {target && kind === 'subscription' && (
            <SubscriptionFields key={target.id ?? 'new-sub'} id={target.kind === 'subscription' ? target.id : undefined} preset={target} onDone={onClose} />
          )}
          {target && kind === 'card' && (
            <CardFields key={target.id ?? 'new-card'} id={target.kind === 'card' ? target.id : undefined} preset={target} onDone={onClose} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function KindButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'pressable flex h-16 flex-1 flex-col items-center justify-center gap-0.5 font-label text-sm',
        'rounded-[14px]',
        active ? 'bg-bh-yellow font-medium text-[#141414]' : 'bg-surface text-subtle',
      )}
    >
      {children}
    </button>
  )
}

function SubscriptionFields({ id, preset, onDone }: { id?: string; preset: NonNullable<SheetTarget>; onDone: () => void }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const sub = state.subscriptions.find((s) => s.id === id)
  const [serviceKey] = useState<string | null>(sub?.serviceKey ?? preset.serviceKey ?? null)
  const [name, setName] = useState(sub?.name ?? getService(preset.serviceKey)?.name ?? preset.name ?? '')
  const [amount, setAmount] = useState(sub ? String(sub.amount).replace('.', ',') : '')
  const [currency, setCurrency] = useState<Currency>(sub?.currency ?? 'TRY')
  const [cycle, setCycle] = useState<BillingCycle>(sub?.cycle ?? 'monthly')
  const [renewalDate, setRenewalDate] = useState(() => sub?.renewalDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [cardId, setCardId] = useState(sub?.cardId ?? '')
  const [error, setError] = useState('')



  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!name.trim()) return setError('Abonelik adını gir.')
    if (!(value > 0)) return setError('Tutarı sayı olarak gir, örneğin 229,99.')
    if (!renewalDate) return setError('Yenilenme tarihini seç.')
    // Elle yazılan ad listedeki bir servise denk geliyorsa logosunu bağla
    const key = getService(serviceKey)?.name === name.trim() ? serviceKey : (matchService(name)?.key ?? null)
    const subscription: Subscription = {
      id: sub?.id ?? newId(),
      name: name.trim(),
      amount: value,
      currency,
      cycle,
      renewalDate,
      cardId: cardId || null,
      serviceKey: key,
    }
    dispatch({ type: 'subscription/save', subscription })
    toast.success(sub ? 'Abonelik güncellendi' : 'Abonelik eklendi')
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3">
      <FieldGroup>
        <Field label="Ad" htmlFor="s-name">
          <input id="s-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix" />
        </Field>
        <Field label="Tutar" htmlFor="s-amount">
          <input id="s-amount" className={cn(inputClass, 'num text-lg')} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="229,99" />
          <select aria-label="Para birimi" className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Periyot">
          <Segmented
            className="w-full"
            value={cycle}
            onChange={setCycle}
            options={[{ value: 'monthly', label: 'Aylık' }, { value: 'yearly', label: 'Yıllık' }]}
          />
        </Field>
        <Field label="Yenilenme" htmlFor="s-date">
          <input id="s-date" type="date" className={inputClass} value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
        </Field>
        <Field label="Kart" htmlFor="s-card">
          <select id="s-card" className={cn(selectClass, 'w-full font-normal text-ink dark:text-ink')} value={cardId} onChange={(e) => setCardId(e.target.value)}>
            <option value="">Kart seçilmedi</option>
            {state.cards.map((c) => <option key={c.id} value={c.id}>{c.bankName} •• {c.last4}</option>)}
          </select>
        </Field>
      </FieldGroup>

      {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
      <PrimaryButton type="submit">Kaydet</PrimaryButton>
      {sub && (
        <button
          type="button"
          className="min-h-11 text-bh-red"
          onClick={() => {
            onDone()
            undoable(`${sub.name} silindi`, () => dispatch({ type: 'subscription/delete', id: sub.id }))
          }}
        >
          Aboneliği sil
        </button>
      )}
    </form>
  )
}

function CardFields({ id, preset, onDone }: { id?: string; preset: NonNullable<SheetTarget>; onDone: () => void }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const card = state.cards.find((c) => c.id === id)
  const [bankName, setBankName] = useState(card?.bankName ?? preset.bankName ?? '')
  const [last4, setLast4] = useState(card?.last4 ?? '')
  const [kind, setKind] = useState<CardKind>(card?.kind ?? 'credit')
  const [statementDay, setStatementDay] = useState<number | null>(card?.statementDay ?? null)
  const credit = kind === 'credit'
  const [error, setError] = useState('')

  // Renk banka adından gelir; listede olmayan bankada düzenlerken eski rengi koru
  const color = bankColor(bankName) ?? (card && card.bankName === bankName.trim() ? card.color : cardColor(bankName))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!bankName.trim()) return setError('Banka adını gir.')
    if (!/^\d{4}$/.test(last4)) return setError('Son 4 hane tam 4 rakam olmalı.')
    if (credit && !statementDay) return setError('Hesap kesim gününü seç.')
    const saved: CreditCard = {
      id: card?.id ?? newId(),
      bankName: fullBankName(bankName),
      last4,
      kind,
      // Banka kartında kesim yok; son ödeme kesimden hesaplanır
      statementDay: credit ? statementDay : null,
      // Limit ve kart ağı artık sorulmuyor; eski kartlarda varsa korunur
      limit: card?.limit ?? 0,
      color,
      network: card?.network ?? null,
    }
    dispatch({ type: 'card/save', card: saved })
    toast.success(card ? 'Kart güncellendi' : 'Kart eklendi')
    onDone()
  }

  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)

  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3">
      <Segmented
        className="bg-surface"
        value={kind}
        onChange={setKind}
        options={[{ value: 'credit', label: 'Kredi kartı' }, { value: 'debit', label: 'Banka kartı' }]}
      />
      <FieldGroup>
        <Field label="Banka adı" htmlFor="c-bank">
          <input id="c-bank" className={inputClass} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Garanti BBVA" />
          {bankName.trim() && <span aria-hidden className="size-4 shrink-0 rounded-full" style={{ background: color }} />}
        </Field>
        <Field label="Son 4 hane" htmlFor="c-last4">
          <input id="c-last4" className={cn(inputClass, 'num tracking-widest')} inputMode="numeric" autoComplete="off" value={last4} onChange={(e) => setLast4(digits(e.target.value, 4))} placeholder="1234" />
        </Field>
        {credit && (
          <Field label="Hesap kesim" htmlFor="c-st">
            <DaySelect id="c-st" value={statementDay} onChange={setStatementDay} />
          </Field>
        )}
      </FieldGroup>

      {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
      <PrimaryButton type="submit">Kaydet</PrimaryButton>
      {card && (
        <button
          type="button"
          className="min-h-11 text-bh-red"
          onClick={() => {
            onDone()
            undoable(`${card.bankName} •• ${card.last4} silindi`, () => dispatch({ type: 'card/delete', id: card.id }))
          }}
        >
          Kartı sil
        </button>
      )}
    </form>
  )
}
