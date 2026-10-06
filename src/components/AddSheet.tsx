import { format } from 'date-fns'
import { CreditCardIcon, RepeatIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { haptic } from '@/lib/haptics'
import { play } from '@/lib/sound'
import { DaySelect, Field, FieldGroup, inputClass, PrimaryButton, Segmented, selectClass } from '@/components/FormBits'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { BANKS, bankColor, bankName as fullBankName, cardColor } from '@/lib/banks'
import { parseAmount } from '@/lib/format'
import { SERVICES, getService, matchService, normalize } from '@/lib/services'
import { newId, useStore } from '@/lib/store'
import { useUndoable } from '@/lib/undo'
import { CURRENCIES, type BillingCycle, type CardKind, type CreditCard, type Currency, type Subscription } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Seçili düğme (tür ve segmentler): açık temada beyaz + hafif gölge, koyu temada bir ton açık gri */
const raised = 'bg-raised text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)] dark:shadow-none'

/** Açılacak form. id varsa düzenleme; serviceKey/name/bankName yeni kayıtta hazır seçili gelir. */
export type SheetTarget = { kind: 'subscription' | 'card'; id?: string; serviceKey?: string; name?: string; bankName?: string } | null

/** "+" ile ya da düzenle ile açılan alt panel */
export function AddSheet({ target, onClose }: { target: SheetTarget; onClose: () => void }) {
  const [kind, setKind] = useState<'subscription' | 'card'>(target?.kind ?? 'subscription')
  const [lastTarget, setLastTarget] = useState(target)
  // Kapanırken son açılan form panelde kalır: içerik silinip panel önce büzülmesin, olduğu gibi aşağı kaysın
  const [shown, setShown] = useState(target)
  // Her açılışta artar: form temiz başlasın (kapanınca silinmediği için eski yazılar kalmasın)
  const [opened, setOpened] = useState(0)
  // Panel açıkken tür elle değiştirildi mi (sadece o zaman kayma animasyonu oynar)
  const [switched, setSwitched] = useState(false)
  // Panel her açıldığında türü hedefe göre sıfırla
  if (target !== lastTarget) {
    setLastTarget(target)
    if (target) {
      setKind(target.kind)
      setSwitched(false)
      setShown(target)
      setOpened((n) => n + 1)
    }
  }
  const editing = !!shown?.id
  function pick(next: 'subscription' | 'card') {
    if (next === kind) return
    haptic()
    setSwitched(true)
    setKind(next)
  }

  // Panel boyu Abonelik ↔ Kart (ya da kredi ↔ banka kartı) değişince zıplamasın: iki formun ilk açıldığı hâllerinden
  // uzun olanı en az boy olur, kısa formda Kaydet alta yaslanır. "Yeni kart ekle" gibi ek alanlar yine büyütür.
  // Ölçüm form ekrana takıldığı an yapılır (panel içeriği açılıştan biraz sonra oluşuyor).
  const tallest = useRef<{ opened: number; sizes: Partial<Record<'subscription' | 'card', number>> }>({ opened: -1, sizes: {} })
  function measure(form: HTMLDivElement | null) {
    const el = form?.parentElement
    if (!el) return
    if (editing) {
      el.style.minHeight = ''
      return
    }
    if (tallest.current.opened !== opened) tallest.current = { opened, sizes: {} }
    const sizes = tallest.current.sizes
    if (sizes[kind] == null) {
      el.style.minHeight = ''
      sizes[kind] = el.offsetHeight
    }
    el.style.minHeight = `${Math.max(...Object.values(sizes))}px`
  }

  // Kapanırken klavyeyi önce indir: klavye panel kayarken kapanınca sayfa sarsılıyor
  function close() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    onClose()
  }

  return (
    <Drawer open={!!target} onOpenChange={(o) => !o && close()}>
      <DrawerContent className="max-h-[94svh] rounded-t-[30px] border-0 bg-page data-[vaul-drawer-direction=bottom]:max-h-[94svh]">
        {/* Kayan alan: min-h-0 ile panel kısalınca (klavye açılınca) o da kısalır ve içerik aşağı yukarı kaydırılabilir */}
        <div className="mx-auto min-h-0 w-full max-w-md overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DrawerTitle className="num pt-3 pb-1 text-center text-lg font-medium">
            {editing ? (kind === 'card' ? 'Kartı düzenle' : 'Aboneliği düzenle') : 'Yeni ekle'}
          </DrawerTitle>
          <DrawerDescription className="sr-only">Abonelik ya da kart bilgileri</DrawerDescription>

          {!editing && (
            <div className="mt-3 flex gap-2">
              <KindButton active={kind === 'subscription'} onClick={() => pick('subscription')}>
                <RepeatIcon className="size-5" /> Abonelik
              </KindButton>
              <KindButton active={kind === 'card'} onClick={() => pick('card')}>
                <CreditCardIcon className="size-5" /> Kart
              </KindButton>
            </div>
          )}

          {/* Abonelik ↔ Kart değişince form yandan kayarak gelir: Kart sağda, Abonelik solda (düğmelerin sırası gibi).
              İlk açılışta kaymaz; panel zaten aşağıdan geliyor. */}
          <div className="flex flex-col">
          <div
            key={kind}
            ref={measure}
            className={cn('flex flex-1 flex-col', switched && 'animate-in fade-in duration-300 ease-out', switched && (kind === 'card' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'))}
          >
            {shown && kind === 'subscription' && (
              <SubscriptionFields key={`${shown.id ?? 'new-sub'}-${opened}`} id={shown.kind === 'subscription' ? shown.id : undefined} preset={shown} onDone={close} />
            )}
            {shown && kind === 'card' && (
              <CardFields key={`${shown.id ?? 'new-card'}-${opened}`} id={shown.kind === 'card' ? shown.id : undefined} preset={shown} onDone={close} />
            )}
          </div>
          </div>
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
        'pressable flex h-16 flex-1 flex-col items-center justify-center gap-0.5 font-label text-sm transition-colors duration-300',
        'rounded-[14px]',
        active ? cn(raised, 'font-medium') : 'bg-line/50 text-subtle dark:bg-surface',
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
  // "Yeni kart ekle" seçilince kartın bilgileri bu formda girilir; kaydedince kart da oluşur ve aboneliğe bağlanır
  const newCard = cardId === NEW_CARD
  const [card, setCard] = useState<NewCard>({ bankName: '', last4: '', kind: 'credit', statementDay: null })
  const [error, setError] = useState('')
  // Hata: mesajla birlikte hafif titreşim
  const fail = (message: string) => {
    haptic()
    setError(message)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!name.trim()) return fail('Abonelik adı girin.')
    if (!(value > 0)) return fail('Tutar sayı olmalı, ör. 229,99.')
    if (!renewalDate) return fail('Yenilenme tarihi seçin.')
    let linkedCard = cardId || null
    if (newCard) {
      const problem = cardProblem(card)
      if (problem) return fail(problem)
      const saved = buildCard(card)
      dispatch({ type: 'card/save', card: saved })
      linkedCard = saved.id
    }
    // Elle yazılan ad listedeki bir servise denk geliyorsa logosunu bağla
    const key = getService(serviceKey)?.name === name.trim() ? serviceKey : (matchService(name)?.key ?? null)
    const subscription: Subscription = {
      id: sub?.id ?? newId(),
      name: name.trim(),
      amount: value,
      currency,
      cycle,
      renewalDate,
      cardId: linkedCard,
      serviceKey: key,
    }
    dispatch({ type: 'subscription/save', subscription })
    haptic()
    play('save')
    toast.success(sub ? 'Abonelik güncellendi' : newCard ? 'Abonelik ve kart eklendi' : 'Abonelik eklendi')
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-1 flex-col gap-3">
      <FieldGroup>
        <Field label="Ad" htmlFor="s-name">
          <SuggestInput
            id="s-name"
            value={name}
            onChange={setName}
            placeholder="Netflix"
            items={SERVICES}
            onPick={(s) => {
              setServiceKey(s.key)
              setName(s.name)
            }}
          />
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
            activeClass={raised}
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
            <option value={NEW_CARD}>+ Yeni kart ekle</option>
          </select>
        </Field>
      </FieldGroup>

      {newCard && (
        <>
          <p className="label -mb-1 px-1 text-subtle">Yeni kart</p>
          <CardInputs value={card} onChange={setCard} idPrefix="sc" />
        </>
      )}

      {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
      <PrimaryButton type="submit" className="mt-auto">Kaydet</PrimaryButton>
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

const NEW_CARD = '__new'

/** Kart formunun alanları (kart ekleme ve abonelik eklerken yeni kart) */
type NewCard = { bankName: string; last4: string; kind: CardKind; statementDay: number | null }

function cardProblem(c: NewCard) {
  if (!c.bankName.trim()) return 'Banka adı girin.'
  if (!/^\d{4}$/.test(c.last4)) return 'Son 4 hane tam 4 rakam olmalı.'
  if (c.kind === 'credit' && !c.statementDay) return 'Hesap kesim günü seçin.'
  return ''
}

/** Renk banka adından gelir; listede olmayan bankada düzenlerken eski rengi koru */
function colorFor(bankName: string, existing?: CreditCard) {
  return bankColor(bankName) ?? (existing && existing.bankName === bankName.trim() ? existing.color : cardColor(bankName))
}

function buildCard(c: NewCard, existing?: CreditCard): CreditCard {
  return {
    id: existing?.id ?? newId(),
    bankName: fullBankName(c.bankName),
    last4: c.last4,
    kind: c.kind,
    // Banka kartında kesim yok; son ödeme kesimden hesaplanır
    statementDay: c.kind === 'credit' ? c.statementDay : null,
    // Limit ve kart ağı artık sorulmuyor; eski kartlarda varsa korunur
    limit: existing?.limit ?? 0,
    color: colorFor(c.bankName, existing),
    network: existing?.network ?? null,
  }
}

function CardInputs({ value, onChange, idPrefix, existing }: { value: NewCard; onChange: (c: NewCard) => void; idPrefix: string; existing?: CreditCard }) {
  const set = (patch: Partial<NewCard>) => onChange({ ...value, ...patch })
  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max)
  return (
    <>
      <Segmented
        className="bg-line/50 dark:bg-surface"
        activeClass={raised}
        value={value.kind}
        onChange={(kind) => set({ kind })}
        options={[{ value: 'credit', label: 'Kredi kartı' }, { value: 'debit', label: 'Banka kartı' }]}
      />
      <FieldGroup>
        <Field label="Banka adı" htmlFor={`${idPrefix}-bank`}>
          <SuggestInput
            id={`${idPrefix}-bank`}
            value={value.bankName}
            onChange={(bankName) => set({ bankName })}
            placeholder="Garanti BBVA"
            items={BANKS}
            onPick={(b) => set({ bankName: b.name })}
          />
          {value.bankName.trim() && <span aria-hidden className="size-4 shrink-0 rounded-full" style={{ background: colorFor(value.bankName, existing) }} />}
        </Field>
        <Field label="Son 4 hane" htmlFor={`${idPrefix}-last4`}>
          <input id={`${idPrefix}-last4`} className={cn(inputClass, 'num tracking-widest')} inputMode="numeric" autoComplete="off" value={value.last4} onChange={(e) => set({ last4: digits(e.target.value, 4) })} placeholder="1234" />
        </Field>
        {/* Banka kartında kesim yok: satır yumuşakça kapanır / açılır */}
        <div
          aria-hidden={value.kind !== 'credit'}
          data-collapsed={value.kind !== 'credit' || undefined}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
            value.kind === 'credit' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <Field label="Hesap kesim" htmlFor={`${idPrefix}-st`}>
              <DaySelect id={`${idPrefix}-st`} value={value.statementDay} onChange={(statementDay) => set({ statementDay })} />
            </Field>
          </div>
        </div>
      </FieldGroup>
    </>
  )
}

function CardFields({ id, preset, onDone }: { id?: string; preset: NonNullable<SheetTarget>; onDone: () => void }) {
  const { state, dispatch } = useStore()
  const undoable = useUndoable()
  const card = state.cards.find((c) => c.id === id)
  const [value, setValue] = useState<NewCard>({
    bankName: card?.bankName ?? preset.bankName ?? '',
    last4: card?.last4 ?? '',
    kind: card?.kind ?? 'credit',
    statementDay: card?.statementDay ?? null,
  })
  const [error, setError] = useState('')
  // Hata: mesajla birlikte hafif titreşim
  const fail = (message: string) => {
    haptic()
    setError(message)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const problem = cardProblem(value)
    if (problem) return fail(problem)
    dispatch({ type: 'card/save', card: buildCard(value, card) })
    haptic()
    play('save')
    toast.success(card ? 'Kart güncellendi' : 'Kart eklendi')
    onDone()
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-1 flex-col gap-3">
      <CardInputs value={value} onChange={setValue} idPrefix="c" existing={card} />

      {error && <p className="px-1 text-sm text-bh-red" role="alert">{error}</p>}
      <PrimaryButton type="submit" className="mt-auto">Kaydet</PrimaryButton>
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

/**
 * Öneri listeli yazı alanı: yazarken adı yazılanla başlayanlar alanın altında açılan bir listede çıkar (iPhone menüsü gibi).
 * Liste alttaki alanların üstüne biner, formu büyütmez. Dokununca ad dolar; alandan çıkınca liste kapanır.
 */
function SuggestInput<T extends { key: string; name: string }>({
  id,
  value,
  onChange,
  placeholder,
  items,
  onPick,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  items: T[]
  onPick: (item: T) => void
}) {
  const [focused, setFocused] = useState(false)
  const q = normalize(value)
  const hints = !q || items.some((i) => normalize(i.name) === q) ? [] : items.filter((i) => normalize(i.name).startsWith(q)).slice(0, 6)
  return (
    <>
      <input
        id={id}
        className={inputClass}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setFocused(true)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {focused && hints.length > 0 && (
        <ul
          role="listbox"
          // Alttan açılan sayfa bu dokunuşu sürükleme sanmasın
          data-vaul-no-drag
          className="absolute top-[calc(100%+10px)] -left-2 z-30 w-[min(15rem,calc(100%+1rem))] overflow-hidden rounded-[14px] bg-surface py-1 shadow-[0_10px_30px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.08)] dark:bg-[#262626] dark:shadow-[0_10px_30px_rgb(0_0_0/0.6),0_0_0_0.5px_rgb(255_255_255/0.12)]"
        >
          {hints.map((i) => (
            <li key={i.key} role="option" aria-selected={false}>
              <button
                type="button"
                // Alanın odağı kaybolmasın (yoksa liste dokunuş bitmeden kapanır). iPhone odağı dokunuştan sonra gelen
                // mousedown'da değiştirir; pointerdown'u engellemek orada yetmiyor. Bu yüzden seçim parmak kalkınca yapılır.
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onPointerUp={() => {
                  onPick(i)
                  setFocused(false)
                }}
                // Klavyeyle seçim (Enter / boşluk)
                onClick={(e) => {
                  if (e.detail > 0) return
                  onPick(i)
                  setFocused(false)
                }}
                className="w-full px-3.5 py-2.5 text-left text-base active:bg-line"
              >
                {i.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
