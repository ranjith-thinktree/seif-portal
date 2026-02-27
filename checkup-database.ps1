# ============================================================================
# DATABASE CHECKUP SCRIPT
# ============================================================================
# Purpose: Check current database structure and identify missing tables
# Date: February 12, 2026
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SEIF Database Checkup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration for XAMPP
$mysqlPath = "C:\xampp\mysql\bin\mysql.exe"
$dbName = "seif"
$dbUser = "root"

# Check if MySQL is accessible
if (-not (Test-Path $mysqlPath)) {
    Write-Host "ERROR: MySQL not found at $mysqlPath" -ForegroundColor Red
    Write-Host "XAMPP may not be installed or MySQL path is different." -ForegroundColor Yellow
    $mysqlPath = Read-Host "Enter correct path to mysql.exe"
    if (-not (Test-Path $mysqlPath)) {
        Write-Host "ERROR: Still cannot find MySQL. Exiting..." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "MySQL found at: $mysqlPath" -ForegroundColor Green
Write-Host ""

# Prompt for password
Write-Host "Enter MySQL root password (leave empty if no password):" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

Write-Host ""
Write-Host "Connecting to database '$dbName'..." -ForegroundColor Gray
Write-Host ""

# Create SQL file with queries
$tempFile = "temp_checkup.sql"
$sqlContent = "-- Check database existence`n"
$sqlContent += "SELECT SCHEMA_NAME as database_name, DEFAULT_CHARACTER_SET_NAME as charset, DEFAULT_COLLATION_NAME as collation FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '$dbName';`n`n"
$sqlContent += "-- Count total tables`n"
$sqlContent += "SELECT COUNT(*) as total_tables FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName';`n`n"
$sqlContent += "-- List all existing tables`n"
$sqlContent += "SELECT TABLE_NAME, ENGINE, TABLE_ROWS, ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS size_mb, CREATE_TIME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName' ORDER BY TABLE_NAME;`n`n"
$sqlContent += "-- Check for package_courses table`n"
$sqlContent += "SELECT 'package_courses' AS table_name, CASE WHEN EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName' AND TABLE_NAME = 'package_courses') THEN 'EXISTS' ELSE 'MISSING' END AS status;`n`n"
$sqlContent += "-- Check for scheduled_refurbishment_notifications table`n"
$sqlContent += "SELECT 'scheduled_refurbishment_notifications' AS table_name, CASE WHEN EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName' AND TABLE_NAME = 'scheduled_refurbishment_notifications') THEN 'EXISTS' ELSE 'MISSING' END AS status;`n`n"
$sqlContent += "-- Check for scheduled_notification_executions table`n"
$sqlContent += "SELECT 'scheduled_notification_executions' AS table_name, CASE WHEN EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName' AND TABLE_NAME = 'scheduled_notification_executions') THEN 'EXISTS' ELSE 'MISSING' END AS status;`n`n"
$sqlContent += "-- List missing required tables`n"
$sqlContent += "SELECT 'MISSING REQUIRED TABLES' AS section;`n"
$sqlContent += "SELECT missing_table, 'CRITICAL - Needed for Refurbishment features' AS importance FROM (SELECT 'package_courses' AS missing_table UNION ALL SELECT 'scheduled_refurbishment_notifications' UNION ALL SELECT 'scheduled_notification_executions') AS required_tables WHERE missing_table NOT IN (SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName');`n`n"
$sqlContent += "-- Summary`n"
$sqlContent += "SELECT (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName') AS current_tables, 44 AS required_tables, 44 - (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName') AS missing_count, CASE WHEN (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName') >= 44 THEN 'DATABASE IS COMPLETE' ELSE CONCAT('MISSING ', 44 - (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$dbName'), ' TABLES') END AS database_status;`n"

[System.IO.File]::WriteAllText($tempFile, $sqlContent)

try {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "DATABASE CHECKUP RESULTS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($passwordPlain) {
        $output = Get-Content $tempFile | & $mysqlPath -u $dbUser "-p$passwordPlain" $dbName -t 2>&1
    } else {
        $output = Get-Content $tempFile | & $mysqlPath -u $dbUser $dbName -t 2>&1
    }
    
    foreach ($line in $output) {
        $lineStr = $line.ToString()
        if ($lineStr -match "EXISTS" -and $lineStr -notmatch "MISSING") {
            Write-Host $lineStr -ForegroundColor Green
        } elseif ($lineStr -match "MISSING") {
            Write-Host $lineStr -ForegroundColor Red
        } elseif ($lineStr -match "COMPLETE") {
            Write-Host $lineStr -ForegroundColor Green
        } elseif ($lineStr -match "ERROR|Error|error") {
            Write-Host $lineStr -ForegroundColor Red
        } elseif ($lineStr -match "CRITICAL") {
            Write-Host $lineStr -ForegroundColor Yellow
        } else {
            Write-Host $lineStr
        }
    }
    
    # Clean up temp file
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "CHECKUP COMPLETE" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Review the results above" -ForegroundColor Gray
    Write-Host "  2. Run backup-database.ps1 to create backup" -ForegroundColor Gray
    Write-Host "  3. Run restore-database.ps1 to add missing tables" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR during checkup: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "  - XAMPP/MySQL not running (start from XAMPP Control Panel)" -ForegroundColor Gray
    Write-Host "  - Wrong password" -ForegroundColor Gray
    Write-Host "  - Database '$dbName' doesn't exist" -ForegroundColor Gray
    Write-Host ""
} finally {
    # Clean up temp file
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Read-Host "Press Enter to exit"
