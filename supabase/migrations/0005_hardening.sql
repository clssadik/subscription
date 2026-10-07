-- Hardening after the first release. Run this whole file once in the Supabase SQL Editor.
-- Safe on a live database: new CHECK and foreign key constraints are added NOT VALID, so rows that
-- already exist are not re-checked, but every new or changed row is.

begin;

-- 1. A push address must be https and come from a known push service:
--    FCM (Chrome), Apple (Safari on iPhone and Mac), Mozilla (Firefox), WNS (Windows).
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_check
  check (endpoint ~* '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)+push\.apple\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|([a-z0-9-]+\.)+notify\.windows\.com)/')
  not valid;

-- 2. At most 10 phones per user (each phone that allowed notifications is one row).
create or replace function public.limit_push_subscriptions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.push_subscriptions where user_id = new.user_id) >= 10 then
    raise exception 'A user can have at most 10 push subscriptions';
  end if;
  return new;
end;
$$;

drop trigger if exists push_subscriptions_limit on public.push_subscriptions;
create trigger push_subscriptions_limit
  before insert on public.push_subscriptions
  for each row execute function public.limit_push_subscriptions();

-- 3. The app saves a phone's push address through this function. A phone can still hold an address that
--    another account used before sign-out, so any row with the same endpoint is removed first, whoever owns it.
--    Only a signed-in user can call it (auth.uid() is the caller).
create or replace function public.claim_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  -- Same rule as push_subscriptions_endpoint_check (section 1)
  if p_endpoint is null or p_endpoint !~* '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)+push\.apple\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|([a-z0-9-]+\.)+notify\.windows\.com)/' then
    raise exception 'Unknown push service' using errcode = '22023';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_user, p_endpoint, p_p256dh, p_auth);
end;
$$;

revoke execute on function public.claim_push_subscription(text, text, text) from public, anon;
grant execute on function public.claim_push_subscription(text, text, text) to authenticated;

-- 4. Card numbers must not be typed into names. A card number has 16 digits, so 6 or more digits are refused.
--    Names are also capped at 80 characters.
alter table public.cards drop constraint if exists cards_bank_name_check;
alter table public.cards
  add constraint cards_bank_name_check
  check (length(regexp_replace(bank_name, '[^0-9]', '', 'g')) < 6 and char_length(bank_name) <= 80)
  not valid;

alter table public.subscriptions drop constraint if exists subscriptions_name_check;
alter table public.subscriptions
  add constraint subscriptions_name_check
  check (length(regexp_replace(name, '[^0-9]', '', 'g')) < 6 and char_length(name) <= 80)
  not valid;

alter table public.missing_logos drop constraint if exists missing_logos_name_check;
alter table public.missing_logos
  add constraint missing_logos_name_check
  check (length(regexp_replace(name, '[^0-9]', '', 'g')) < 6 and char_length(name) <= 80)
  not valid;

-- 5. A credit limit cannot be negative.
alter table public.cards drop constraint if exists cards_credit_limit_check;
alter table public.cards
  add constraint cards_credit_limit_check
  check (credit_limit >= 0)
  not valid;

-- 6. Notification settings are always a JSON object (the app and send-reminders read fields from it).
alter table public.user_settings drop constraint if exists user_settings_notify_check;
alter table public.user_settings
  add constraint user_settings_notify_check
  check (jsonb_typeof(notify) = 'object')
  not valid;

-- 7. The app never needs TRUNCATE, REFERENCES or TRIGGER. TRUNCATE skips row level security, and REFERENCES
--    can be used to find out whether a hidden row exists. Tables created later get the same default grants,
--    so the default is changed as well.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;

-- 8. A subscription can only link to a card that belongs to the same user.
--    The single column link subscriptions.card_id -> cards(id) becomes (card_id, user_id) -> cards(id, user_id).
--    The old foreign key is found by its column, so its generated name does not matter.
do $$
declare
  fk record;
begin
  for fk in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.subscriptions'::regclass
      and con.confrelid = 'public.cards'::regclass
      and con.contype = 'f'
      and array_length(con.conkey, 1) = 1
      and con.conkey[1] = (
        select a.attnum
        from pg_attribute a
        where a.attrelid = 'public.subscriptions'::regclass and a.attname = 'card_id'
      )
  loop
    execute format('alter table public.subscriptions drop constraint %I', fk.conname);
  end loop;
end;
$$;

-- The composite foreign key needs a unique key on the referenced pair. id is already unique, so this is cheap.
-- The foreign key is dropped first on purpose: it depends on the unique key, so a re-run needs this order.
alter table public.subscriptions drop constraint if exists subscriptions_card_id_user_id_fkey;
alter table public.cards drop constraint if exists cards_id_user_id_key;
alter table public.cards add constraint cards_id_user_id_key unique (id, user_id);

-- ON DELETE SET NULL (card_id) clears only card_id. user_id is NOT NULL and must stay.
alter table public.subscriptions
  add constraint subscriptions_card_id_user_id_fkey
  foreign key (card_id, user_id) references public.cards (id, user_id)
  on delete set null (card_id)
  not valid;

-- Optional, later: checks the rows that already exist. It fails if an old row links to another user's card.
-- alter table public.subscriptions validate constraint subscriptions_card_id_user_id_fkey;

commit;
