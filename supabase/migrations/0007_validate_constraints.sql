-- Profile names get the same card-number guard as every other name, and the rules that 0005 added as NOT VALID
-- (new rows only) are now checked against the existing rows too. All existing rows passed these checks on 2026-10-08.
-- Run this whole file once in the Supabase SQL Editor.

begin;

-- 1. Card numbers must not be typed into the profile name either (16 digits, so 6 or more digits are refused).
alter table public.user_settings drop constraint if exists user_settings_name_check;
alter table public.user_settings
  add constraint user_settings_name_check
  check (length(regexp_replace(name, '[^0-9]', '', 'g')) < 6 and char_length(name) <= 80);

-- 2. Check the existing rows against the rules from 0005. Each fails if an old row breaks its rule.
alter table public.push_subscriptions validate constraint push_subscriptions_endpoint_check;
alter table public.cards validate constraint cards_bank_name_check;
alter table public.subscriptions validate constraint subscriptions_name_check;
alter table public.missing_logos validate constraint missing_logos_name_check;
alter table public.cards validate constraint cards_credit_limit_check;
alter table public.user_settings validate constraint user_settings_notify_check;
alter table public.subscriptions validate constraint subscriptions_card_id_user_id_fkey;

commit;
