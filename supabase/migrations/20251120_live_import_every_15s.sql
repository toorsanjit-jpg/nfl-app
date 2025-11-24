-- Enable required extensions for cron jobs and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop the cron job if it already exists (for idempotency)
SELECT cron.unschedule('live_import_every_15s') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'live_import_every_15s'
);

-- Create cron job to call import_finished_games Edge Function
-- Schedule: "*/15 * * * *" = Every 15 minutes
-- Note: Standard cron doesn't support seconds. For 15-second intervals,
--       you would need a different approach (e.g., pg_cron with a wrapper function)
-- Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- Replace YOUR_ANON_KEY with your Supabase anonymous key
SELECT cron.schedule(
  'live_import_every_15s',              -- Job name
  '*/15 * * * *',                       -- Cron schedule: Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/import_finished_games',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := jsonb_build_object(),
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);

-- Verify the cron job was created
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'live_import_every_15s';

