# setup-cron.ps1
# Sets up the sync_schedule cron job in Supabase

Write-Host "=== Supabase Cron Job Setup ===" -ForegroundColor Cyan
Write-Host ""

# Get Supabase project reference
$projectRef = Read-Host "Enter your Supabase project reference (e.g., abcdefghijklmnop)"
if (-not $projectRef) {
    Write-Host "Error: Project reference is required" -ForegroundColor Red
    exit 1
}

# Get Supabase anon key
$anonKey = Read-Host "Enter your Supabase anonymous key"
if (-not $anonKey) {
    Write-Host "Error: Anonymous key is required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting up cron job..." -ForegroundColor Cyan

# Read the SQL migration file
$sqlFile = "supabase\migrations\20251120_sync_schedule_cron.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "Error: SQL migration file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $sqlFile -Raw

# Replace placeholders
$sqlContent = $sqlContent -replace 'YOUR_PROJECT_REF', $projectRef
$sqlContent = $sqlContent -replace 'YOUR_ANON_KEY', $anonKey

# Save temporary SQL file
$tempSqlFile = "temp_cron_setup.sql"
$sqlContent | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "SQL prepared. You can now run this SQL in your Supabase SQL editor:" -ForegroundColor Yellow
Write-Host "  Dashboard > SQL Editor > New Query" -ForegroundColor Gray
Write-Host ""
Write-Host "Or use the Supabase CLI:" -ForegroundColor Yellow
Write-Host "  supabase db execute --file $tempSqlFile" -ForegroundColor Gray
Write-Host ""

$runNow = Read-Host "Do you want to run this SQL now using Supabase CLI? (y/n)"
if ($runNow -eq 'y' -or $runNow -eq 'Y') {
    Write-Host "Executing SQL..." -ForegroundColor Cyan
    try {
        supabase db execute --file $tempSqlFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✓ Cron job 'sync_schedule_9am' has been scheduled!" -ForegroundColor Green
            Write-Host '  Schedule: 0 16 * * * (4 PM UTC daily)' -ForegroundColor Gray
            Write-Host "  Function: sync_schedule" -ForegroundColor Gray
        } else {
            Write-Host "✗ Failed to execute SQL. Check the error above." -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error executing SQL: $_" -ForegroundColor Red
        Write-Host "  You can manually run the SQL file: $tempSqlFile" -ForegroundColor Yellow
    }
} else {
    Write-Host "SQL file saved to: $tempSqlFile" -ForegroundColor Green
    Write-Host "Run it manually in the Supabase SQL editor or via CLI." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green

