-- A subscription can be paid through the phone bill (carrier billing) instead of a card.
-- Run this whole file once in the Supabase SQL Editor, before the new app or send-reminders is deployed.

begin;

-- Existing rows get false: they are paid by card or have no payment method set.
alter table public.subscriptions add column if not exists on_bill boolean not null default false;

-- A subscription on the phone bill is not also linked to a card.
alter table public.subscriptions drop constraint if exists subscriptions_bill_or_card_check;
alter table public.subscriptions
  add constraint subscriptions_bill_or_card_check
  check (not on_bill or card_id is null);

commit;
