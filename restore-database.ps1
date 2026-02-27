# ============================================================================
# DATABASE RESTORATION SCRIPT
# ============================================================================
# Purpose: Restore missing tables to SEIF database after backup restoration
# Date: February 12, 2026
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SEIF Database Restoration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration for XAMPP
$mysqlPath = "C:\xampp\mysql\bin\mysql.exe"
$dbName = "seif"
$dbUser = "root"
$restoreFile = "RESTORE_MISSING_TABLES.sql"
$verifyFile = "VERIFY_DATABASE.sql"

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Gray
Write-Host ""

# Check if backup exists
$latestBackup = Get-ChildItem -Path "backups" -Filter "seif_backup_*.sql" -ErrorAction SilentlyContinue | 
                Sort-Object LastWriteTime -Descending | 
                Select-Object -First 1

if ($latestBackup) {
    $backupAge = (Get-Date) - $latestBackup.LastWriteTime
    if ($backupAge.TotalMinutes -lt 30) {
        Write-Host "✓ Recent backup found: $($latestBackup.Name)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No recent backup found (last backup: $([math]::Round($backupAge.TotalHours, 1)) hours ago)" -ForegroundColor Yellow
        Write-Host "  Recommendation: Run backup-database.ps1 first" -ForegroundColor Gray
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") {
            Write-Host "Exiting..." -ForegroundColor Yellow
            exit 0
        }
    }
} else {
    Write-Host "⚠️  WARNING: No backup found!" -ForegroundColor Yellow
    Write-Host "  Strongly recommended: Run backup-database.ps1 first" -ForegroundColor Red
    $continue = Read-Host "Continue without backup? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Exiting... Please run backup-database.ps1 first" -ForegroundColor Yellow
        exit 0
    }
}
Write-Host ""

# Check if MySQL is accessible
if (-not (Test-Path $mysqlPath)) {
    Write-Host "❌ ERROR: MySQL not found at $mysqlPath" -ForegroundColor Red
    Write-Host "Please update the mysql path in this script." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if SQL files exist
if (-not (Test-Path $restoreFile)) {
    Write-Host "❌ ERROR: $restoreFile not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path $verifyFile)) {
    Write-Host "❌ ERROR: $verifyFile not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Files found:" -ForegroundColor Green
Write-Host "  ✓ $restoreFile" -ForegroundColor Gray
Write-Host "  ✓ $verifyFile" -ForegroundColor Gray
Write-Host ""

# Prompt for password
Write-Host "Please enter MySQL root password (leave empty if no password):" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 1: Restoring Missing Tables" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    if ($passwordPlain) {
        & $mysqlPath -u $dbUser -p"$passwordPlain" $dbName < $restoreFile 2>&1 | Out-String | Write-Host
    } else {
        & $mysqlPath -u $dbUser $dbName < $restoreFile 2>&1 | Out-String | Write-Host
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Tables restored successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️ Restoration completed with warnings. Check output above." -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR during restoration: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 2: Verifying Database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    if ($passwordPlain) {
        & $mysqlPath -u $dbUser -p"$passwordPlain" $dbName < $verifyFile 2>&1 | Out-String | Write-Host
    } else {
        & $mysqlPath -u $dbUser $dbName < $verifyFile 2>&1 | Out-String | Write-Host
    }
    
    Write-Host ""
    Write-Host "✅ Verification complete!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ ERROR during verification: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Restoration Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tables Added:" -ForegroundColor Green
Write-Host "  1. package_courses" -ForegroundColor Gray
Write-Host "  2. scheduled_refurbishment_notifications" -ForegroundColor Gray
Write-Host "  3. scheduled_notification_executions" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Start your backend server: cd backend && npm run dev" -ForegroundColor Gray
Write-Host "  2. Start your frontend: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host "  3. Test the application" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
