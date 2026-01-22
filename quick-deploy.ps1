# 🚀 Quick Deploy Script - Organization Management Feature
# Run this script to deploy both frontend and backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 SEIF Portal - Organization Management Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$FRONTEND_PATH = "C:\Users\ranji\Desktop\TT\SEIF\frontend"
$BACKEND_PATH = "C:\Users\ranji\Desktop\TT\SEIF\backend"
$S3_BUCKET = "seif-portal-frontend"
$SERVER_IP = "18.61.83.249"
$SERVER_USER = "ubuntu"
$SSH_KEY = "seif-backend-key.pem"  # Update path if needed

# Step 1: Frontend Build
Write-Host "📦 Step 1: Building Frontend..." -ForegroundColor Yellow
cd $FRONTEND_PATH

Write-Host "  - Running npm build..." -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend build successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy Frontend to S3
Write-Host "☁️ Step 2: Deploying Frontend to S3..." -ForegroundColor Yellow

$deployFrontend = Read-Host "Deploy to S3 now? (y/n)"
if ($deployFrontend -eq 'y') {
    Write-Host "  - Syncing to S3 bucket: $S3_BUCKET..." -ForegroundColor Gray
    aws s3 sync dist/ "s3://$S3_BUCKET" --delete --profile seif
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend deployed to S3!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ S3 sync failed. Check AWS credentials." -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️ Skipping S3 deployment" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Backend Deployment
Write-Host "🖥️ Step 3: Backend Deployment..." -ForegroundColor Yellow

$deployBackend = Read-Host "Deploy backend via SSH? (y/n)"
if ($deployBackend -eq 'y') {
    Write-Host "  - Connecting to server: $SERVER_IP..." -ForegroundColor Gray
    Write-Host "  - SSH Key: $SSH_KEY" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📝 Manual SSH commands:" -ForegroundColor Cyan
    Write-Host "  ssh -i `"$SSH_KEY`" $SERVER_USER@$SERVER_IP" -ForegroundColor White
    Write-Host "  cd /home/ubuntu/seif-backend" -ForegroundColor White
    Write-Host "  git pull origin main" -ForegroundColor White
    Write-Host "  pm2 restart seif-backend" -ForegroundColor White
    Write-Host "  pm2 status" -ForegroundColor White
    Write-Host "  exit" -ForegroundColor White
    Write-Host ""
    
    $sshNow = Read-Host "Open SSH session now? (y/n)"
    if ($sshNow -eq 'y') {
        ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP"
    }
} else {
    Write-Host "⏭️ Skipping backend deployment" -ForegroundColor Gray
}
Write-Host ""

# Step 4: Verification
Write-Host "🔍 Step 4: Post-Deployment Verification" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Checklist:" -ForegroundColor Green
Write-Host "  1. Open production URL in browser" -ForegroundColor White
Write-Host "  2. Login with your credentials" -ForegroundColor White
Write-Host "  3. Navigate to Organization Management" -ForegroundColor White
Write-Host "  4. Partners tab: Check contact columns (incharge, email, phone, address)" -ForegroundColor White
Write-Host "  5. Centers tab: Check center head columns (name, email, phone, courses)" -ForegroundColor White
Write-Host "  6. Verify NO approval_status column (different from Data page)" -ForegroundColor White
Write-Host "  7. Test filters and search" -ForegroundColor White
Write-Host "  8. Test Export CSV" -ForegroundColor White
Write-Host "  9. Test Reset Password (Partners tab)" -ForegroundColor White
Write-Host " 10. Navigate to Data page - confirm unchanged" -ForegroundColor White
Write-Host " 11. Check browser console - no errors" -ForegroundColor White
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files Deployed:" -ForegroundColor Yellow
Write-Host "  ✨ OrganizationPartnersPage.jsx (575 lines)" -ForegroundColor Green
Write-Host "  ✨ OrganizationCentersPage.jsx (532 lines)" -ForegroundColor Green
Write-Host "  🔄 OrganizationManagementPage.jsx (updated imports)" -ForegroundColor Green
Write-Host "  🔄 routes.js, navigation.js, AppRoutes.jsx" -ForegroundColor Green
Write-Host ""
Write-Host "Data Page Status:" -ForegroundColor Yellow
Write-Host "  ✅ PartnersPage.jsx (828 lines) - UNCHANGED" -ForegroundColor Green
Write-Host "  ✅ CentersPage.jsx (860 lines) - UNCHANGED" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Verify deployment at production URL" -ForegroundColor White
Write-Host "  2. Test all functionality" -ForegroundColor White
Write-Host "  3. Notify users of new feature" -ForegroundColor White
Write-Host "  4. Monitor for any issues" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full Guide: ORGANIZATION_MANAGEMENT_DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Deployment script completed!" -ForegroundColor Green
Write-Host ""
