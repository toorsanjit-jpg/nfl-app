-- Enable required extensions for cron jobs and HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop the cron job if it already exists (for idempotency)
SELECT cron.unschedule('sync_schedule_9pm') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync_schedule_9pm'
);

-- Create cron job to call sync_schedule Edge Function
SELECT cron.schedule(
  'sync_schedule_9pm',                    -- Job name
  '0 4 * * *',                   -- Cron schedule
  $$
  SELECT net.http_post(
    url := 'https://mvmsmiggkkpwzobeyegw.supabase.co/functions/v1/sync_schedule',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bXNtaWdna2twd3pvYmV5ZWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDc3NTEsImV4cCI6MjA3OTA4Mzc1MX0.GDDs9AWV1qTNSvYDUAkMzrdcfmnoEXB8-BQ4LyRX0H4'
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
