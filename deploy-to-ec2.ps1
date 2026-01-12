# ===================================
# SEIF Portal - EC2 Deployment Script
# ===================================

Write-Host "🚀 Starting deployment to EC2..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Commit and push local changes
Write-Host "📝 Step 1: Committing local changes..." -ForegroundColor Yellow
cd C:\Users\ranji\Desktop\TT\SEIF

git add .
git commit -m "feat: Add User Management + Fix CORS and imports"
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Git push failed or no changes to commit" -ForegroundColor Yellow
    Write-Host "Continuing with deployment..." -ForegroundColor Yellow
}

Write-Host "✅ Step 1: Complete" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy backend to EC2
Write-Host "🔧 Step 2: Deploying backend to EC2..." -ForegroundColor Yellow

$commands = @"
cd /home/ubuntu/seif-backend
echo '📥 Pulling latest changes...'
git pull origin main
echo '📦 Installing dependencies...'
npm install --production
echo '🔄 Restarting PM2...'
pm2 restart seif-backend
echo '📊 PM2 Status:'
pm2 list
echo '📋 Recent logs:'
pm2 logs seif-backend --lines 20 --nostream
"@

ssh -i "C:\Users\ranji\Desktop\TT\SEIF\seif-backend-key.pem" ubuntu@18.61.83.249 $commands

Write-Host "✅ Step 2: Complete" -ForegroundColor Green
Write-Host ""

# Step 3: Display deployment info
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Live Portal URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://seif-portal-frontend.s3-website.ap-south-2.amazonaws.com"
Write-Host "   Backend API: http://18.61.83.249:5000"
Write-Host ""
Write-Host "🔍 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Test login at the S3 frontend URL"
Write-Host "   2. Verify User Management features work"
Write-Host "   3. Check PM2 logs if any issues: pm2 logs seif-backend"
Write-Host ""
