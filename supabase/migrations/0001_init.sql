-- Tables for cards, subscriptions, payments and missing logo notes.
-- Every row belongs to one user; row level security limits each user to their own rows.

create table public.cards (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  bank_name text not null,
  last4 text not null check (last4 ~ '^[0-9]{4}$'),
  kind text not null default 'credit' check (kind in ('credit', 'debit')),
  -- Debit cards have no statement day. The due date is computed: statement + 10 days.
  statement_day smallint check (statement_day between 1 and 31),
  credit_limit numeric(14, 2) not null default 0,
  color text not null,
  network text check (network in ('visa', 'mastercard', 'troy', 'amex')),
  created_at timestamptz not null default now(),
  check (kind = 'debit' or statement_day is not null)
);

create table public.subscriptions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('TRY', 'USD', 'EUR')),
  cycle text not null check (cycle in ('monthly', 'yearly')),
  renewal_date date not null,
  card_id uuid references public.cards on delete set null,
  service_key text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('subscription', 'card')),
  ref_id uuid not null,
  due_date date not null,
  paid_at date not null,
  amount numeric(14, 2),
  currency text check (currency in ('TRY', 'USD', 'EUR')),
  unique (user_id, ref_id, due_date)
);

-- Services added without a logo. Checked by the developer at the start of each session.
create table public.missing_logos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  first_seen date not null default current_date,
  unique (user_id, name)
);

create index on public.cards (user_id);
create index on public.subscriptions (user_id);
create index on public.payments (user_id);

alter table public.cards enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.missing_logos enable row level security;

create policy "own cards" on public.cards
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own subscriptions" on public.subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own payments" on public.payments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own missing logos" on public.missing_logos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
