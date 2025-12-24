#!/bin/bash
cd /home/ubuntu/seif-backend

echo "=== 1. Checking if FROM dual exists in analytics service ==="
grep -c "FROM dual" src/api/v1/services/analytics.service.js || echo "0 - NOT FOUND"

echo ""
echo "=== 2. Checking lines 50-70 of analytics service ==="
sed -n '50,70p' src/api/v1/services/analytics.service.js

echo ""
echo "=== 3. Testing direct query with FROM dual ==="
node -e "
const db = require('./src/database/connection');
const query = \`SELECT 
  (SELECT COUNT(*) FROM partners WHERE status = 'active') as total_partners,
  (SELECT COUNT(*) FROM centers WHERE status = 'active') as total_centers
FROM dual\`;
db.query(query).then(result => {
  console.log('Query Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}).catch(error => {
  console.error('Query Error:', error.message);
  process.exit(1);
});
"

echo ""
echo "=== 4. Checking .env database config ==="
grep "DB_" /home/ubuntu/seif-backend/.env | grep -v "PASSWORD"

echo ""
echo "=== 5. Checking PM2 status ==="
pm2 list

echo ""
echo "=== 6. Checking when file was last modified ==="
stat /home/ubuntu/seif-backend/src/api/v1/services/analytics.service.js | grep Modify
