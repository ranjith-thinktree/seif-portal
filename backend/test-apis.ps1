# Test New Refurbishment APIs
# Run: .\test-apis.ps1

$baseUrl = "http://localhost:5000/api/v1"

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "   Testing New Refurbishment APIs" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Step 1: Login to get token
Write-Host "`n[1/8] Logging in as partner (testing with partner account - admin required in production)..." -ForegroundColor Yellow

$loginBody = @{
    email = "demo.partner@seif.org"
    password = "Password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.success -and $loginResponse.data.accessToken) {
        $token = $loginResponse.data.accessToken
        Write-Host "✅ Login successful" -ForegroundColor Green
        
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
    } else {
        Write-Host "❌ Login failed: No access token in response" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test Year Stats API
Write-Host "`n[2/8] Testing: GET /stats/year/2024" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/refurbishment/stats/year/2024" -Headers $headers -Method Get
    Write-Host "✅ Year Stats API working" -ForegroundColor Green
    Write-Host "   Data: $($response.data | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 3: Test Packages API
Write-Host "`n[3/8] Testing: GET /packages" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/refurbishment/packages" -Headers $headers -Method Get
    Write-Host "✅ Packages API working" -ForegroundColor Green
    Write-Host "   Total packages: $($response.data.totalCount)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Test Alerts API
Write-Host "`n[4/8] Testing: GET /alerts" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/refurbishment/alerts?limit=10&offset=0" -Headers $headers -Method Get
    Write-Host "✅ Alerts API working" -ForegroundColor Green
    Write-Host "   Total alerts: $($response.data.totalCount)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 5: Test Active Requests API
Write-Host "`n[5/8] Testing: GET /requests" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/refurbishment/requests?limit=10&offset=0" -Headers $headers -Method Get
    Write-Host "✅ Active Requests API working" -ForegroundColor Green
    Write-Host "   Total requests: $($response.data.totalCount)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 6: Test Past Requests API
Write-Host "`n[6/8] Testing: GET /past-requests" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/refurbishment/past-requests?limit=10&offset=0&year=2024" -Headers $headers -Method Get
    Write-Host "✅ Past Requests API working" -ForegroundColor Green
    Write-Host "   Total past requests: $($response.data.totalCount)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Test Send Notification API (skip - needs valid IDs)
Write-Host "`n[7/8] Testing: POST /notify" -ForegroundColor Yellow
Write-Host "⚠️  Skipping - requires valid centerId and partnerId" -ForegroundColor Yellow

# Step 8: Test Create Request API (skip - needs valid IDs)
Write-Host "`n[8/8] Testing: POST /create-request" -ForegroundColor Yellow
Write-Host "⚠️  Skipping - requires valid partnerId, centerId, and packageIds" -ForegroundColor Yellow

Write-Host "`n===========================================" -ForegroundColor Cyan
Write-Host "   API Tests Complete!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "`nTo test POST APIs, update the script with valid IDs" -ForegroundColor Gray
