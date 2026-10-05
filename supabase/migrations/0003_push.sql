-- Web Push: each phone that allowed notifications, and a log of sent reminders
-- so the 15-minute job never sends the same reminder twice.

create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Written only by the send-reminders function (service role); no policies, so users can't read or write it.
create table public.notification_log (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  sent_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key, sent_on)
);

alter table public.notification_log enable row level security;
