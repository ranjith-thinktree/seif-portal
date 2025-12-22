#!/bin/bash
# monitoring-deploy.sh
# Script to deploy Sentry monitoring to SEIF Portal backend

set -e  # Exit on error

echo "================================================"
echo "🔧 SEIF Portal - Monitoring Deployment"
echo "================================================"
echo ""

# Configuration
EC2_HOST="ubuntu@18.61.83.249"
SSH_KEY="seif-backend-key.pem"
BACKEND_DIR="/home/ubuntu/seif-backend"

# Step 1: Install Sentry packages on EC2
echo "📦 Step 1: Installing Sentry packages..."
ssh -i $SSH_KEY $EC2_HOST << 'EOF'
  cd /home/ubuntu/seif-backend
  echo "Installing @sentry/node and @sentry/profiling-node..."
  npm install @sentry/node@^7.114.0 @sentry/profiling-node@^7.114.0 --save
  
  if [ $? -eq 0 ]; then
    echo "✅ Sentry packages installed successfully"
  else
    echo "❌ Failed to install Sentry packages"
    exit 1
  fi
EOF

echo ""
echo "⚠️  IMPORTANT: Configure Sentry DSN"
echo "------------------------------------------------"
echo "1. Sign up at https://sentry.io (if not already)"
echo "2. Create a new project: 'SEIF Portal Backend'"
echo "3. Get your DSN from Project Settings → Client Keys"
echo ""
echo "📝 Enter your Sentry DSN (or press Enter to skip):"
read SENTRY_DSN

if [ -n "$SENTRY_DSN" ]; then
  echo ""
  echo "🔑 Step 2: Adding Sentry DSN to .env..."
  ssh -i $SSH_KEY $EC2_HOST << EOF
    cd /home/ubuntu/seif-backend
    
    # Check if SENTRY_DSN already exists
    if grep -q "SENTRY_DSN" .env; then
      echo "Updating existing SENTRY_DSN..."
      sed -i 's|^SENTRY_DSN=.*|SENTRY_DSN=$SENTRY_DSN|' .env
    else
      echo "Adding new SENTRY_DSN..."
      echo "" >> .env
      echo "# Sentry Error Tracking" >> .env
      echo "SENTRY_DSN=$SENTRY_DSN" >> .env
    fi
    
    echo "✅ Sentry DSN configured"
EOF
else
  echo "⚠️  Skipping Sentry DSN configuration"
  echo "   You can add it later to /home/ubuntu/seif-backend/.env"
fi

echo ""
echo "🔄 Step 3: Restarting PM2..."
ssh -i $SSH_KEY $EC2_HOST << 'EOF'
  cd /home/ubuntu/seif-backend
  pm2 restart seif-backend --update-env
  
  echo ""
  echo "⏳ Waiting 5 seconds for backend to start..."
  sleep 5
  
  # Health check
  HEALTH=$(curl -s http://localhost:5000/health | grep -o '"status":"OK"')
  
  if [ "$HEALTH" == '"status":"OK"' ]; then
    echo "✅ Backend restarted successfully"
    echo ""
    pm2 info seif-backend
  else
    echo "❌ Health check failed"
    echo "Showing last 20 lines of logs:"
    pm2 logs seif-backend --lines 20 --nostream
    exit 1
  fi
EOF

echo ""
echo "================================================"
echo "✅ Monitoring Deployment Complete!"
echo "================================================"
echo ""
echo "📊 Next Steps:"
echo ""
echo "1. PM2 Plus (Optional):"
echo "   - Sign up: https://app.pm2.io/"
echo "   - Run: ssh -i $SSH_KEY $EC2_HOST 'pm2 link <SECRET> <PUBLIC> seif-production'"
echo ""
echo "2. Verify Sentry Integration:"
echo "   - Visit: https://sentry.io/organizations/your-org/issues/"
echo "   - Errors will appear here automatically"
echo ""
echo "3. Test Error Tracking:"
echo "   - Trigger a test error from frontend"
echo "   - Check Sentry dashboard for the event"
echo ""
echo "4. View Current Status:"
echo "   - Run: ssh -i $SSH_KEY $EC2_HOST 'pm2 monit'"
echo ""
echo "================================================"
