-- Calls the send-reminders edge function every 15 minutes.
-- Replace <CRON_SECRET> with the same value as the function's CRON_SECRET secret before running.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://cxuihxolgfiyaviacfpp.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
