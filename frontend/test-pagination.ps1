# ============================================
# PAGINATION TEST SCRIPT
# Tests all refurbishment tabs pagination
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PAGINATION TESTING - SEIF PORTAL" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Check if frontend is running
Write-Host "[Test 1] Checking Frontend Server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Frontend is running on http://localhost:5173`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend is NOT running. Please start with 'npm run dev'`n" -ForegroundColor Red
    exit 1
}

# Test 2: Check backend
Write-Host "[Test 2] Checking Backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Backend is running on http://localhost:5000`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is NOT running. Please start backend`n" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MANUAL TESTING CHECKLIST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Please test the following manually:`n" -ForegroundColor Yellow

Write-Host "1️⃣  ELIGIBILITY TAB:" -ForegroundColor Cyan
Write-Host "   - Navigate to Refurbishment → Eligibility tab"
Write-Host "   - Verify pagination footer shows at bottom"
Write-Host "   - Verify 'Showing 1 to 10 of X results'"
Write-Host "   - Click 'Next' button → should go to page 2"
Write-Host "   - Verify S.No continues correctly (11-20 on page 2)"
Write-Host "   - Click 'Previous' → should return to page 1`n"

Write-Host "2️⃣  ALERTS TAB:" -ForegroundColor Cyan
Write-Host "   - Navigate to Refurbishment → Alerts tab"
Write-Host "   - Verify pagination footer shows"
Write-Host "   - Test pagination buttons work"
Write-Host "   - Verify S.No sequence correct`n"

Write-Host "3️⃣  ACTIVE REQUESTS TAB:" -ForegroundColor Cyan
Write-Host "   - Navigate to Refurbishment → Requests → Active Requests tab"
Write-Host "   - Verify pagination footer shows"
Write-Host "   - Test pagination works"
Write-Host "   - Verify S.No sequence`n"

Write-Host "4️⃣  PAST REQUESTS TAB:" -ForegroundColor Cyan
Write-Host "   - Navigate to Refurbishment → Requests → Past Requests tab"
Write-Host "   - Select different financial years"
Write-Host "   - Verify pagination resets to page 1"
Write-Host "   - Test pagination works across year changes`n"

Write-Host "5️⃣  FILTER + PAGINATION:" -ForegroundColor Cyan
Write-Host "   - On any tab, apply a filter"
Write-Host "   - Verify pagination resets to page 1"
Write-Host "   - Verify total count updates"
Write-Host "   - Test pagination with filtered data`n"

Write-Host "6️⃣  SEARCH + PAGINATION:" -ForegroundColor Cyan
Write-Host "   - Use search bar on any tab"
Write-Host "   - Verify pagination resets to page 1"
Write-Host "   - Verify pagination works with search results`n"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMPARISON WITH OVERVIEW CARDS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Navigate to Refurbishment → Overview tab and compare:`n" -ForegroundColor Yellow

Write-Host "✅ All Centers Card:" -ForegroundColor Green
Write-Host "   - Has pagination footer"
Write-Host "   - Shows 10 items per page"
Write-Host "   - Pagination buttons work"
Write-Host "   - S.No sequence correct`n"

Write-Host "✅ Eligible Centers Card:" -ForegroundColor Green
Write-Host "   - Has pagination footer"
Write-Host "   - Shows 10 items per page"
Write-Host "   - Compare with Eligibility tab (should match)`n"

Write-Host "✅ Last Refurbished Card:" -ForegroundColor Green
Write-Host "   - Has pagination footer"
Write-Host "   - Same behavior as other cards`n"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PLAYWRIGHT AUTOMATED TESTING" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Run automated tests:" -ForegroundColor Yellow
Write-Host "   npx playwright test tests/refurbishment-pagination.spec.js --headed`n"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EXPECTED RESULTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ Pagination footer visible on ALL tabs" -ForegroundColor Green
Write-Host "✅ Shows 'Showing X to Y of Z results'" -ForegroundColor Green
Write-Host "✅ 10 items per page displayed" -ForegroundColor Green
Write-Host "✅ Next/Previous buttons work correctly" -ForegroundColor Green
Write-Host "✅ S.No sequence correct across pages" -ForegroundColor Green
Write-Host "✅ Pagination resets when filters/search change" -ForegroundColor Green
Write-Host "✅ No console errors" -ForegroundColor Green
Write-Host "✅ Matches Overview card behavior`n" -ForegroundColor Green

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Press any key to open browser for testing..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "http://localhost:5173/admin/refurbishment"

Write-Host "`n✅ Browser opened. Please test manually and report results.`n" -ForegroundColor Green
