#!/bin/bash
set -e
echo "=== Downloading backend patch ==="
aws s3 cp s3://seif-portal-frontend/tmp/backend-patch.tar.gz /tmp/backend-patch.tar.gz --region ap-south-2

echo "=== Extracting patch ==="
rm -rf /tmp/backend-patch-extract
mkdir -p /tmp/backend-patch-extract
tar -xzf /tmp/backend-patch.tar.gz -C /tmp/backend-patch-extract

echo "=== Applying patch ==="
cp -r /tmp/backend-patch-extract/* /home/ubuntu/seif-backend/src/
chown -R ubuntu:ubuntu /home/ubuntu/seif-backend/src

echo "=== Cleaning up ==="
rm -rf /tmp/backend-patch.tar.gz /tmp/backend-patch-extract

echo "=== Restarting PM2 ==="
export HOME=/home/ubuntu
export PATH=/home/ubuntu/.nvm/versions/node/v20.18.0/bin:$PATH
sudo -u ubuntu bash -c 'export HOME=/home/ubuntu && export PATH=/home/ubuntu/.nvm/versions/node/v20.18.0/bin:$PATH && pm2 restart seif-backend'
sleep 5
sudo -u ubuntu bash -c 'export HOME=/home/ubuntu && pm2 list'

echo "=== DONE ==="
