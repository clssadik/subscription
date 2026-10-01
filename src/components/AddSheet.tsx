import { format } from 'date-fns'
import { CreditCardIcon, RepeatIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Field, FieldGroup, inputClass, PrimaryButton, Segmented, selectClass } from '@/components/FormBits'
import { Logo } from '@/components/Logo'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { BANKS, CARD_COLORS, NETWORKS, bankColor } from '@/lib/banks'
import { parseAmount } from '@/lib/format'
import { QUICK_PICKS, SERVICES, getService, matchService } from '@/lib/services'
import { newId, useStore } from '@/lib/store'
import { useUndoable } from '@/lib/undo'
import { CURRENCIES, type BillingCycle, type CardNetwork, type CreditCard, type Currency, type Subscription } from '@/lib/types'
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
          <div className="flex items-center justify-between pt-3 pb-1">
            <button onClick={onClose} className="min-h-11 text-subtle">Vazgeç</button>
            <DrawerTitle className="num text-lg font-medium">
              {editing ? (kind === 'card' ? 'Kartı düzenle' : 'Aboneliği düzenle') : 'Yeni ekle'}
            </DrawerTitle>
            <span className="w-14" />
          </div>
          <DrawerDescription className="sr-only">Abonelik ya da kart bilgilerini gir.</DrawerDescription>

          {!editing && (
            <div className="mt-3 flex gap-2">
              <KindButton active={kind === 'subscription'} onClick={() => setKind('subscription')} arch>
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

function KindButton({ active, arch, onClick, children }: { active: boolean; arch?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'pressable flex h-16 flex-1 flex-col items-center justify-center gap-0.5 font-label text-sm',
        arch ? 'rounded-[32px_32px_14px_14px]' : 'rounded-[14px]',
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
  const [serviceKey, setServiceKey] = useState<string | null>(sub?.serviceKey ?? preset.serviceKey ?? null)
  const [name, setName] = useState(sub?.name ?? getService(preset.serviceKey)?.name ?? preset.name ?? '')
  const [amount, setAmount] = useState(sub ? String(sub.amount).replace('.', ',') : '')
  const [currency, setCurrency] = useState<Currency>(sub?.currency ?? 'TRY')
  const [cycle, setCycle] = useState<BillingCycle>(sub?.cycle ?? 'monthly')
  const [renewalDate, setRenewalDate] = useState(() => sub?.renewalDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [cardId, setCardId] = useState(sub?.cardId ?? '')
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  const picks = showAll ? SERVICES : SERVICES.filter((s) => QUICK_PICKS.includes(s.key))

  function pick(key: string) {
    const s = getService(key)!
    setServiceKey(key)
    setName(s.name)
  }

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
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="label text-subtle">Hızlı seç</span>
          <button type="button" onClick={() => setShowAll((v) => !v)} className="min-h-9 text-sm text-subtle">
            {showAll ? 'Daha az' : 'Tümü'}
          </button>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {picks.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => pick(s.key)}
              aria-label={s.name}
              aria-pressed={serviceKey === s.key}
              className={cn(
                'pressable flex aspect-square items-center justify-center rounded-xl',
                serviceKey === s.key && 'outline-2 outline-offset-2 outline-bh-yellow',
              )}
            >
              <Logo serviceKey={s.key} name={s.name} size={40} />
            </button>
          ))}
        </div>
      </div>

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
  const [color, setColor] = useState(card?.color ?? bankColor(preset.bankName ?? '') ?? CARD_COLORS[0])
  const [last4, setLast4] = useState(card?.last4 ?? '')
  const [statementDay, setStatementDay] = useState(card ? String(card.statementDay) : '')
  const [dueDay, setDueDay] = useState(card ? String(card.dueDay) : '')
  const [limit, setLimit] = useState(card ? String(card.limit) : '')
  const [network, setNetwork] = useState<CardNetwork | null>(card?.network ?? null)
  const [error, setError] = useState('')

  function chooseBank(name: string) {
    setBankName(name)
    const c = bankColor(name)
    if (c) setColor(c)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const sDay = Number(statementDay)
    const dDay = Number(dueDay)
    const lim = limit.trim() ? parseAmount(limit) : 0
    if (!bankName.trim()) return setError('Banka adını gir ya da listeden seç.')
    if (!/^\d{4}$/.test(last4)) return setError('Son 4 hane tam 4 rakam olmalı.')
    if (!Number.isInteger(sDay) || sDay < 1 || sDay > 31) return setError('Hesap kesim günü 1-31 arası olmalı.')
    if (!Number.isInteger(dDay) || dDay < 1 || dDay > 31) return setError('Son ödeme günü 1-31 arası olmalı.')
    if (!(lim >= 0)) return setError('Limiti sayı olarak gir.')
    const saved: CreditCard = {
      id: card?.id ?? newId(),
      bankName: bankName.trim(),
      last4,
      statementDay: sDay,
      dueDay: dDay,
      limit: lim,
      color,
      network,
    }
    dispatch({ type: 'card/save', card: saved })
    toast.success(card ? 'Kart güncellendi' : 'Kart eklendi')
    onDone()
  }

  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)

  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3">
      <div>
        <span className="label mb-2 block px-1 text-subtle">Banka</span>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {BANKS.map((b) => (
            <button
              key={b.name}
              type="button"
              onClick={() => chooseBank(b.name)}
              aria-pressed={bankName === b.name}
              className={cn(
                'pressable flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm',
                bankName === b.name ? 'bg-ink text-page' : 'bg-surface',
              )}
            >
              <span className="size-2.5 rounded-full" style={{ background: b.color }} />
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <FieldGroup>
        <Field label="Banka adı" htmlFor="c-bank">
          <input id="c-bank" className={inputClass} value={bankName} onChange={(e) => chooseBank(e.target.value)} placeholder="Listede yoksa yaz" />
        </Field>
        <Field label="Son 4 hane" htmlFor="c-last4">
          <input id="c-last4" className={cn(inputClass, 'num tracking-widest')} inputMode="numeric" autoComplete="off" value={last4} onChange={(e) => setLast4(digits(e.target.value, 4))} placeholder="1234" />
        </Field>
        <Field label="Hesap kesim" htmlFor="c-st">
          <input id="c-st" className={cn(inputClass, 'num')} inputMode="numeric" value={statementDay} onChange={(e) => setStatementDay(digits(e.target.value, 2))} placeholder="Ayın kaçı? 15" />
        </Field>
        <Field label="Son ödeme" htmlFor="c-due">
          <input id="c-due" className={cn(inputClass, 'num')} inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(digits(e.target.value, 2))} placeholder="Ayın kaçı? 25" />
        </Field>
        <Field label="Limit (₺)" htmlFor="c-limit">
          <input id="c-limit" className={cn(inputClass, 'num')} inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="İsteğe bağlı" />
        </Field>
        <Field label="Kart ağı" stacked>
          <Segmented
            className="w-full"
            value={network ?? ('none' as const)}
            onChange={(v) => setNetwork(v === 'none' ? null : (v as CardNetwork))}
            options={[{ value: 'none' as const, label: '—' }, ...NETWORKS.map((n) => ({ value: n.key, label: n.label }))]}
          />
        </Field>
        <Field label="Renk">
          <div className="flex flex-wrap gap-2 py-1.5">
            {(CARD_COLORS.includes(color) ? CARD_COLORS : [color, ...CARD_COLORS.slice(0, -1)]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Renk ${c}`}
                aria-pressed={color === c}
                className={cn('size-7 rounded-full', color === c && 'outline-2 outline-offset-2 outline-bh-yellow')}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
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
