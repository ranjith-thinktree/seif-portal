# SEIF Portal - Local Startup Script
# Run this instead of using XAMPP Control Panel

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SEIF Portal - Starting Local Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Kill any stale processes
Write-Host "`n[1/4] Cleaning up stale processes..." -ForegroundColor Yellow
Get-Process -Name "mysqld" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Remove-Item "C:\xampp\mysql\data\mysql.pid" -Force -ErrorAction SilentlyContinue

# 2. Start MySQL
Write-Host "[2/4] Starting MySQL..." -ForegroundColor Yellow
Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" `
    -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini","--standalone" `
    -WindowStyle Hidden
Start-Sleep -Seconds 5

$mysql = Get-Process -Name "mysqld" -ErrorAction SilentlyContinue
if ($mysql) {
    Write-Host "  MySQL is running! (PID: $($mysql.Id))" -ForegroundColor Green
} else {
    Write-Host "  ERROR: MySQL failed to start!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 3. Start Backend
Write-Host "[3/4] Starting Backend (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit","-Command","Write-Host 'SEIF Backend' -ForegroundColor Cyan; cd 'C:\Users\ranji\Desktop\TT\SEIF\backend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# 4. Start Frontend
Write-Host "[4/4] Starting Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit","-Command","Write-Host 'SEIF Frontend' -ForegroundColor Cyan; cd 'C:\Users\ranji\Desktop\TT\SEIF\frontend'; npm run dev" -WindowStyle Normal

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Green
Write-Host "  MySQL:    localhost:3306" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nPress Enter to stop all services..." -ForegroundColor Yellow
Read-Host

# Cleanup on exit
Write-Host "Stopping services..." -ForegroundColor Yellow
Get-Process -Name "mysqld" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "MySQL stopped. Close the other terminal windows manually." -ForegroundColor Cyan
