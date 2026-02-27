# =================================================================
# Financial Year Filter - Quick Test Runner
# =================================================================
# This script helps you run the FY filter tests easily
# Usage: .\run-fy-tests.ps1 [option]
# Options: manual, auto, both, install
# =================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet('manual', 'auto', 'both', 'install', 'report')]
    [string]$Mode = 'both'
)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  SEIF Portal - Financial Year Filter Testing  " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the frontend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the frontend directory" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "   Expected: <project>/frontend" -ForegroundColor Yellow
    exit 1
}

# Function to check if servers are running
function Test-Servers {
    Write-Host "🔍 Checking if servers are running..." -ForegroundColor Yellow
    
    # Check backend (port 5000)
    $backendRunning = $false
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendRunning = $true
            Write-Host "   ✅ Backend server is running (port 5000)" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Backend server is NOT running (port 5000)" -ForegroundColor Red
        Write-Host "      Start with: cd backend && node src/server.js" -ForegroundColor Yellow
    }
    
    # Check frontend (port 5173)
    $frontendRunning = $false
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $frontendRunning = $true
            Write-Host "   ✅ Frontend server is running (port 5173)" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Frontend server is NOT running (port 5173)" -ForegroundColor Red
        Write-Host "      Start with: npm run dev" -ForegroundColor Yellow
    }
    
    if (-not $backendRunning -or -not $frontendRunning) {
        Write-Host ""
        Write-Host "⚠️  Warning: Both servers must be running for tests to work!" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Do you want to continue anyway? (y/N)"
        if ($continue -ne 'y') {
            exit 1
        }
    }
    Write-Host ""
}

# Function to install Playwright
function Install-Playwright {
    Write-Host "📦 Installing Playwright..." -ForegroundColor Cyan
    Write-Host ""
    
    # Check if already installed
    $playwright = npm list @playwright/test 2>$null | Select-String "@playwright/test"
    if ($playwright) {
        Write-Host "✅ Playwright is already installed" -ForegroundColor Green
        Write-Host "   Version: $($playwright -replace '.*@playwright/test@', '')" -ForegroundColor Gray
    } else {
        Write-Host "Installing @playwright/test..." -ForegroundColor Yellow
        npm install -D @playwright/test
    }
    
    Write-Host ""
    Write-Host "📥 Installing browsers..." -ForegroundColor Cyan
    npx playwright install
    
    Write-Host ""
    Write-Host "✅ Playwright installation complete!" -ForegroundColor Green
    Write-Host ""
}

# Function to run manual testing
function Start-ManualTesting {
    Write-Host "📋 TASK 8: Manual Testing" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opening manual testing checklist..." -ForegroundColor Yellow
    Write-Host ""
    
    $checklistPath = "MANUAL_TESTING_CHECKLIST.md"
    if (Test-Path $checklistPath) {
        # Try to open with default markdown viewer
        Start-Process $checklistPath
        Write-Host "✅ Checklist opened!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Please follow the checklist and mark each test case:" -ForegroundColor Yellow
        Write-Host "   - Open $checklistPath" -ForegroundColor Gray
        Write-Host "   - Execute all test suites (11 suites, 80+ tests)" -ForegroundColor Gray
        Write-Host "   - Mark each test as ✅ Pass or ❌ Fail" -ForegroundColor Gray
        Write-Host "   - Document any bugs found" -ForegroundColor Gray
        Write-Host "   - Complete final sign-off" -ForegroundColor Gray
        Write-Host ""
        Write-Host "⏱️  Estimated time: 30-45 minutes" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error: MANUAL_TESTING_CHECKLIST.md not found!" -ForegroundColor Red
        Write-Host "   Expected location: $(Get-Location)\$checklistPath" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Function to run automated tests
function Start-AutomatedTesting {
    Write-Host "🤖 TASK 9: Automated Testing (Playwright)" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if test file exists
    $testFile = "tests\refurbishment-fy-filter.spec.js"
    if (-not (Test-Path $testFile)) {
        Write-Host "❌ Error: Test file not found!" -ForegroundColor Red
        Write-Host "   Expected: $testFile" -ForegroundColor Yellow
        exit 1
    }
    
    # Check if Playwright is installed
    $playwright = npm list @playwright/test 2>$null | Select-String "@playwright/test"
    if (-not $playwright) {
        Write-Host "⚠️  Playwright not installed!" -ForegroundColor Yellow
        Write-Host ""
        Install-Playwright
    }
    
    Write-Host "Running test options:" -ForegroundColor Yellow
    Write-Host "  1. UI Mode (Recommended - Interactive debugger)" -ForegroundColor Cyan
    Write-Host "  2. Headed Mode (Watch browser execution)" -ForegroundColor Cyan
    Write-Host "  3. Headless Mode (Fast, no UI)" -ForegroundColor Cyan
    Write-Host "  4. Specific Browser (Choose chromium/firefox/webkit)" -ForegroundColor Cyan
    Write-Host ""
    
    $choice = Read-Host "Select option (1-4, or Enter for UI Mode)"
    
    switch ($choice) {
        "2" {
            Write-Host ""
            Write-Host "▶️  Running in HEADED mode..." -ForegroundColor Green
            npx playwright test $testFile --headed
        }
        "3" {
            Write-Host ""
            Write-Host "▶️  Running in HEADLESS mode..." -ForegroundColor Green
            npx playwright test $testFile
        }
        "4" {
            Write-Host ""
            Write-Host "Select browser:" -ForegroundColor Yellow
            Write-Host "  1. Chromium (Chrome/Edge)" -ForegroundColor Cyan
            Write-Host "  2. Firefox" -ForegroundColor Cyan
            Write-Host "  3. WebKit (Safari)" -ForegroundColor Cyan
            $browser = Read-Host "Choice (1-3)"
            $browserName = switch ($browser) {
                "1" { "chromium" }
                "2" { "firefox" }
                "3" { "webkit" }
                default { "chromium" }
            }
            Write-Host ""
            Write-Host "▶️  Running on $browserName..." -ForegroundColor Green
            npx playwright test $testFile --project=$browserName
        }
        default {
            Write-Host ""
            Write-Host "▶️  Running in UI MODE..." -ForegroundColor Green
            Write-Host "   This opens an interactive test runner where you can:" -ForegroundColor Gray
            Write-Host "   - Run tests one by one" -ForegroundColor Gray
            Write-Host "   - Watch tests execute in browser" -ForegroundColor Gray
            Write-Host "   - Debug failed tests" -ForegroundColor Gray
            Write-Host ""
            npx playwright test $testFile --ui
        }
    }
    
    Write-Host ""
    Write-Host "✅ Test execution complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 View detailed report:" -ForegroundColor Yellow
    Write-Host "   npx playwright show-report" -ForegroundColor Cyan
    Write-Host ""
}

# Function to show report
function Show-Report {
    Write-Host "📊 Opening Test Report..." -ForegroundColor Cyan
    Write-Host ""
    
    if (Test-Path "playwright-report") {
        npx playwright show-report
    } else {
        Write-Host "❌ No report found. Run tests first!" -ForegroundColor Red
        Write-Host "   Run: .\run-fy-tests.ps1 auto" -ForegroundColor Yellow
    }
}

# Main execution
Write-Host "Mode: $Mode" -ForegroundColor Gray
Write-Host ""

switch ($Mode) {
    'install' {
        Install-Playwright
    }
    'manual' {
        Test-Servers
        Start-ManualTesting
    }
    'auto' {
        Test-Servers
        Start-AutomatedTesting
    }
    'report' {
        Show-Report
    }
    'both' {
        Test-Servers
        
        Write-Host "Running both manual and automated tests..." -ForegroundColor Cyan
        Write-Host ""
        
        # Manual testing first
        Start-ManualTesting
        
        Write-Host "Press Enter when manual testing is complete..." -ForegroundColor Yellow
        Read-Host
        
        # Then automated testing
        Start-AutomatedTesting
    }
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Testing Session Complete!                     " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Review test results" -ForegroundColor Gray
Write-Host "   2. Fix any bugs found" -ForegroundColor Gray
Write-Host "   3. Re-run failed tests" -ForegroundColor Gray
Write-Host "   4. Generate final report" -ForegroundColor Gray
Write-Host "   5. Mark Tasks 8-9 complete ✅" -ForegroundColor Gray
Write-Host ""
Write-Host "Need help? Check TESTING_INSTRUCTIONS.md" -ForegroundColor Cyan
Write-Host ""
