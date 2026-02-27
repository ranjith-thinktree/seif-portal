Write-Host "======================================" -ForegroundColor Cyan
Write-Host "SEIF Database - Quick Backup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$mysqldumpPath = "C:\xampp\mysql\bin\mysqldump.exe"
$dbName = "seif"
$dbUser = "root"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups"
$backupFile = "seif_backup_$timestamp.sql"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Created backups directory" -ForegroundColor Green
}

Write-Host "Enter MySQL root password (leave empty if no password):" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "Creating backup..." -ForegroundColor Gray
Write-Host "File: $backupDir\$backupFile" -ForegroundColor Gray
Write-Host ""

$fullBackupPath = Join-Path $backupDir $backupFile

try {
    if ($passwordPlain) {
        & $mysqldumpPath -u $dbUser "-p$passwordPlain" --routines --triggers --events --single-transaction $dbName > $fullBackupPath 2>&1
    } else {
        & $mysqldumpPath -u $dbUser --routines --triggers --events --single-transaction $dbName > $fullBackupPath 2>&1
    }
    
    if (Test-Path $fullBackupPath) {
        $fileSize = (Get-Item $fullBackupPath).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host "BACKUP SUCCESSFUL!" -ForegroundColor Green
        Write-Host "Size: $fileSizeMB MB" -ForegroundColor Gray
        Write-Host "Location: $fullBackupPath" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "ERROR: Backup file not created!" -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}

Read-Host "Press Enter to continue"
