# supabase-cron-deploy.ps1
# Mimics the supabase cron deploy command interface
# Usage: .\supabase-cron-deploy.ps1 -JobName "sync_schedule_9pm" -Function "sync_schedule" -Schedule "0 4 * * *"

param(
    [Parameter(Mandatory=$true)]
    [string]$JobName,
    
    [Parameter(Mandatory=$true)]
    [string]$Function,
    
    [Parameter(Mandatory=$true)]
    [string]$Schedule
)

Write-Host "=== Deploying Supabase Cron Job ===" -ForegroundColor Cyan
Write-Host "Job Name: $JobName" -ForegroundColor Gray
Write-Host "Function: $Function" -ForegroundColor Gray
Write-Host "Schedule: $Schedule" -ForegroundColor Gray
Write-Host ""

# Get Supabase project details
$projectRef = $env:SUPABASE_PROJECT_REF
$anonKey = $env:SUPABASE_ANON_KEY

if (-not $projectRef) {
    $projectRef = Read-Host "Enter your Supabase project reference"
}

if (-not $anonKey) {
    $anonKey = Read-Host "Enter your Supabase anonymous key"
}

if (-not $projectRef -or -not $anonKey) {
    Write-Host "Error: Project reference and anonymous key are required" -ForegroundColor Red
    exit 1
}

Write-Host "Creating SQL migration..." -ForegroundColor Cyan

# Build SQL string
$sqlLines = @()
$sqlLines += "-- Enable required extensions for cron jobs and HTTP requests"
$sqlLines += "CREATE EXTENSION IF NOT EXISTS pg_cron;"
$sqlLines += "CREATE EXTENSION IF NOT EXISTS pg_net;"
$sqlLines += ""
$sqlLines += "-- Drop the cron job if it already exists (for idempotency)"
$sqlLines += "SELECT cron.unschedule('$JobName') WHERE EXISTS ("
$sqlLines += "  SELECT 1 FROM cron.job WHERE jobname = '$JobName'"
$sqlLines += ");"
$sqlLines += ""
$sqlLines += "-- Create cron job to call $Function Edge Function"
$sqlLines += "SELECT cron.schedule("
$sqlLines += "  '$JobName',                    -- Job name"
$sqlLines += "  '$Schedule',                   -- Cron schedule"
$sqlLines += "  \$\$"
$sqlLines += "  SELECT net.http_post("
$sqlLines += "    url := 'https://$projectRef.supabase.co/functions/v1/$Function',"
$sqlLines += "    headers := jsonb_build_object("
$sqlLines += "      'Content-Type', 'application/json',"
$sqlLines += "      'Authorization', 'Bearer $anonKey'"
$sqlLines += "    ),"
$sqlLines += "    body := jsonb_build_object(),"
$sqlLines += "    timeout_milliseconds := 300000"
$sqlLines += "  ) AS request_id;"
$sqlLines += "  \$\$"
$sqlLines += ");"
$sqlLines += ""
$sqlLines += "-- Verify the cron job was created"
$sqlLines += "SELECT jobid, jobname, schedule, command"
$sqlLines += "FROM cron.job"
$sqlLines += "WHERE jobname = '$JobName';"

$sql = $sqlLines -join "`n"

# Save to temporary file
$tempSqlFile = "temp_cron_$JobName.sql"
$sql | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "SQL file created: $tempSqlFile" -ForegroundColor Green
Write-Host ""

# Try to execute via Supabase CLI
Write-Host "Attempting to deploy via Supabase CLI..." -ForegroundColor Cyan
try {
    $result = supabase db execute --file $tempSqlFile 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Success: Cron job '$JobName' deployed successfully!" -ForegroundColor Green
        Write-Host "  Function: $Function" -ForegroundColor Gray
        Write-Host "  Schedule: $Schedule" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Output:" -ForegroundColor Cyan
        Write-Host $result
    } else {
        Write-Host "Failed to deploy via CLI. Exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "Output: $result" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "You can manually run the SQL file in Supabase Dashboard:" -ForegroundColor Yellow
        Write-Host "  Dashboard -> SQL Editor -> New Query" -ForegroundColor Gray
        Write-Host "  Then paste the contents of: $tempSqlFile" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "You can manually run the SQL file in Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "  Dashboard -> SQL Editor -> New Query" -ForegroundColor Gray
    Write-Host "  Then paste the contents of: $tempSqlFile" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Complete ===" -ForegroundColor Green
