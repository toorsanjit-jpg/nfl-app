-- Enable required extensions for cron jobs and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop the cron job if it already exists (for idempotency)
SELECT cron.unschedule('sync_schedule_9pm') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync_schedule_9pm'
);

-- Create cron job to call sync_schedule Edge Function
-- Schedule: "0 4 * * *" = 4 AM UTC daily (adjust timezone as needed)
-- Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- Replace YOUR_ANON_KEY with your Supabase anonymous key
SELECT cron.schedule(
  'sync_schedule_9pm',                    -- Job name
  '0 4 * * *',                           -- Cron schedule: 4 AM UTC daily (04:00)
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync_schedule',
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
WHERE jobname = 'sync_schedule_9pm';

