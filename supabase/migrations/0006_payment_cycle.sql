-- Billing cycle on each payment (monthly or yearly). A subscription can switch cycle, so a payment made
-- under the old cycle must not mark a renewal of the new cycle as paid. Card payments keep it empty.
-- Run this whole file once in the Supabase SQL Editor, before the new app or send-reminders is deployed.

begin;

-- A new nullable column does not touch existing rows.
alter table public.payments add column if not exists cycle text check (cycle in ('monthly', 'yearly'));

-- Existing subscription payments take the subscription's current cycle, the only one we know for them.
update public.payments p
set cycle = s.cycle
from public.subscriptions s
where p.kind = 'subscription'
  and p.ref_id = s.id
  and p.user_id = s.user_id
  and p.cycle is null;

commit;
