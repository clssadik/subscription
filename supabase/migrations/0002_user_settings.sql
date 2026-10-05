-- Per-user settings: profile name and notification preferences.
-- The notification sender (step 4) will read reminders from here.

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null default '',
  notify jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "own settings" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
