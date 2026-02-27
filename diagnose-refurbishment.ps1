#!/usr/bin/env pwsh
# Refurbishment Dashboard - Quick Diagnostic Script

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  SEIF Refurbishment Dashboard Diagnostics   " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Backend Server
Write-Host "[1/6] Checking Backend Server on Port 5000..." -ForegroundColor Yellow
$backendPort = netstat -ano | findstr ":5000" | findstr "LISTENING"
if ($backendPort) {
    Write-Host "  ✅ Backend server is RUNNING on port 5000" -ForegroundColor Green
    Write-Host "     $backendPort" -ForegroundColor Gray
} else {
    Write-Host "  ❌ Backend server is NOT running on port 5000" -ForegroundColor Red
    Write-Host "     FIX: cd backend && npm start" -ForegroundColor Yellow
    $needsBackend = $true
}
Write-Host ""

# Test 2: Check Frontend Server
Write-Host "[2/6] Checking Frontend Server on Port 5173..." -ForegroundColor Yellow
$frontendPort = netstat -ano | findstr ":5173" | findstr "LISTENING"
if ($frontendPort) {
    Write-Host "  ✅ Frontend server is RUNNING on port 5173" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend server is NOT running on port 5173" -ForegroundColor Red
    Write-Host "     FIX: cd frontend && npm run dev" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Check MySQL Server
Write-Host "[3/6] Checking MySQL Server..." -ForegroundColor Yellow
try {
    $mysqlProcess = Get-Process -Name mysqld -ErrorAction Stop
    Write-Host "  ✅ MySQL server is RUNNING (PID: $($mysqlProcess.Id))" -ForegroundColor Green
} catch {
    Write-Host "  ❌ MySQL server is NOT running" -ForegroundColor Red
    Write-Host "     FIX: Start MySQL service" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Test Backend Health Endpoint (if backend running)
Write-Host "[4/6] Testing Backend Health Endpoint..." -ForegroundColor Yellow
if (-not $needsBackend) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/health" -Method GET -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ Backend health endpoint responding" -ForegroundColor Green
            $content = $response.Content | ConvertFrom-Json
            Write-Host "     Response: $($content.message)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ❌ Backend health endpoint not responding" -ForegroundColor Red
        Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⏭️  Skipped (backend not running)" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: Check Database Connection
Write-Host "[5/6] Testing Database Connection..." -ForegroundColor Yellow
if (-not $needsBackend) {
    try {
        # Try to query centers count
        $mysqlPath = "mysql"
        $query = "SELECT COUNT(*) as count FROM centers;"
        $result = & $mysqlPath -u root -proot seif -e $query 2>&1
        
        if ($result -match "count") {
            Write-Host "  ✅ Database connection successful" -ForegroundColor Green
            Write-Host "     Centers table accessible" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠️  Database connection unclear" -ForegroundColor Yellow
            Write-Host "     Manual verification recommended" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not test database (mysql command not found)" -ForegroundColor Yellow
        Write-Host "     Please verify manually: mysql -u root -p seif" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⏭️  Skipped (backend not running)" -ForegroundColor Yellow
}
Write-Host ""

# Test 6: Check Node Processes
Write-Host "[6/6] Checking Node.js Processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  ✅ Found $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
    foreach ($proc in $nodeProcesses) {
        Write-Host "     PID: $($proc.Id) | Memory: $([math]::Round($proc.WS / 1MB, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ No Node.js processes found" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "                   SUMMARY                     " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

if ($needsBackend) {
    Write-Host ""
    Write-Host "⚠️  ISSUE IDENTIFIED: Backend server not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "TO FIX:" -ForegroundColor Yellow
    Write-Host "  1. cd C:\Users\ranji\Desktop\TT\SEIF\backend" -ForegroundColor White
    Write-Host "  2. npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "THEN:" -ForegroundColor Yellow
    Write-Host "  - Refresh browser at http://localhost:5173/admin/refurbishment" -ForegroundColor White
    Write-Host "  - Data should display in cards and tables" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✅ Both servers appear to be running" -ForegroundColor Green
    Write-Host ""
    Write-Host "IF DATA STILL NOT SHOWING:" -ForegroundColor Yellow
    Write-Host "  1. Open browser DevTools (F12)" -ForegroundColor White
    Write-Host "  2. Go to Network tab" -ForegroundColor White
    Write-Host "  3. Navigate to http://localhost:5173/admin/refurbishment" -ForegroundColor White
    Write-Host "  4. Check for API calls to /admin/refurbishment/*" -ForegroundColor White
    Write-Host "  5. Check Console tab for errors" -ForegroundColor White
    Write-Host ""
    Write-Host "VERIFY AUTHENTICATION:" -ForegroundColor Yellow
    Write-Host "  - Must be logged in as ADMIN user" -ForegroundColor White
    Write-Host "  - Check: localStorage.getItem('user')" -ForegroundColor White
    Write-Host ""
    Write-Host "VERIFY DATABASE HAS DATA:" -ForegroundColor Yellow
    Write-Host "  - mysql -u root -p seif" -ForegroundColor White
    Write-Host "  - SELECT COUNT(*) FROM centers;" -ForegroundColor White
    Write-Host ""
}

Write-Host "For detailed troubleshooting guide, see:" -ForegroundColor Cyan
Write-Host "  REFURBISHMENT_DATA_FIX.md" -ForegroundColor White
Write-Host ""
