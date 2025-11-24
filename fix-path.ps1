# fix-path.ps1
# Adds Scoop shims to User PATH if not already present
# Fixes PATH so Scoop and Supabase CLI work

Write-Host "=== Fix PATH Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Detect the Scoop shims folder
Write-Host "Step 1: Detecting Scoop shims folder..." -ForegroundColor Cyan
$scoopShimsPath = Join-Path $env:USERPROFILE "scoop\shims"

if (-not (Test-Path $scoopShimsPath)) {
    Write-Host "✗ Scoop shims directory not found at: $scoopShimsPath" -ForegroundColor Yellow
    Write-Host "  Skipping PATH update. Install Scoop first if needed." -ForegroundColor Yellow
    exit 0
}

Write-Host "✓ Found Scoop shims at: $scoopShimsPath" -ForegroundColor Green
Write-Host ""

# Step 2: Check if it's already in PATH and add if not
Write-Host "Step 2: Checking if Scoop shims is in User PATH..." -ForegroundColor Cyan
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Normalize paths for comparison (case-insensitive, handle trailing slashes)
$scoopShimsNormalized = $scoopShimsPath.TrimEnd('\').ToLower()
$pathEntries = if ($userPath) { $userPath -split ';' } else { @() }
$isInPath = $pathEntries | Where-Object { 
    $_.TrimEnd('\').ToLower() -eq $scoopShimsNormalized 
} | Measure-Object | Select-Object -ExpandProperty Count

if ($isInPath -gt 0) {
    Write-Host "✓ Scoop shims is already in User PATH." -ForegroundColor Green
    $pathUpdated = $false
} else {
    Write-Host "Adding Scoop shims to User PATH..." -ForegroundColor Cyan
    
    # Add to User PATH (permanent)
    $newUserPath = if ($userPath) { "$userPath;$scoopShimsPath" } else { $scoopShimsPath }
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    
    Write-Host "✓ Successfully added Scoop shims to User PATH!" -ForegroundColor Green
    $pathUpdated = $true
    
    # Update current session PATH
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine")
}

Write-Host ""

# Step 3: Broadcast PATH refresh
if ($pathUpdated) {
    Write-Host "Step 3: Broadcasting PATH refresh notification..." -ForegroundColor Cyan
    $code = @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
        uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
    public static readonly IntPtr HWND_BROADCAST = new IntPtr(0xffff);
    public static readonly uint WM_SETTINGCHANGE = 0x001a;
    public static readonly UIntPtr SMTO_ABORTIFHUNG = new UIntPtr(0x0002);
}
"@
    
    try {
        Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
        $result = [UIntPtr]::Zero
        [Win32]::SendMessageTimeout(
            [Win32]::HWND_BROADCAST,
            [Win32]::WM_SETTINGCHANGE,
            [UIntPtr]::Zero,
            "Environment",
            0x0002,
            5000,
            [ref]$result
        ) | Out-Null
        Write-Host "✓ PATH change notification broadcasted." -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not broadcast PATH change (non-critical): $_" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Step 4: Print PATH and test commands
Write-Host "Step 4: Printing updated PATH..." -ForegroundColor Cyan
$currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentUserPath) {
    $currentUserPath -split ';' | ForEach-Object { 
        if ($_) { Write-Host "  $_" -ForegroundColor Gray }
    }
} else {
    Write-Host "  (User PATH is empty)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Step 5: Testing commands..." -ForegroundColor Cyan
Write-Host ""

# Test scoop --version
Write-Host "Testing 'scoop --version'..." -ForegroundColor Cyan
try {
    $scoopVersion = & scoop --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Scoop is working!" -ForegroundColor Green
        Write-Host "  $scoopVersion" -ForegroundColor Gray
    } else {
        Write-Host "✗ Scoop command failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host "  Output: $scoopVersion" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Scoop command not found or failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test supabase --version
Write-Host "Testing 'supabase --version'..." -ForegroundColor Cyan
try {
    $supabaseVersion = & supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Supabase CLI is working!" -ForegroundColor Green
        Write-Host "  $supabaseVersion" -ForegroundColor Gray
    } else {
        Write-Host "✗ Supabase command failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host "  Output: $supabaseVersion" -ForegroundColor Gray
        Write-Host "  Note: You may need to install Supabase CLI via: scoop install supabase" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Supabase command not found or failed: $_" -ForegroundColor Red
    Write-Host "  Note: You may need to install Supabase CLI via: scoop install supabase" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Script completed! ===" -ForegroundColor Green
if ($pathUpdated) {
    Write-Host "Note: PATH has been updated. New terminals should see the changes." -ForegroundColor Yellow
    Write-Host "      You may need to restart your current terminal for full effect." -ForegroundColor Yellow
}

