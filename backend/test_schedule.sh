#!/bin/bash
# Test scheduling endpoint
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seif.org","password":"Password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

echo "Login: ${TOKEN:0:30}..."

# Get a valid partner+center combination first
PARTNERS=$(curl -s "http://localhost/api/v1/partners?page=1&limit=1" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); p=d['data']['partners'][0]; print(p['id'])" 2>/dev/null)

echo "Partner: $PARTNERS"

# Check centers for that partner
CENTERS=$(curl -s "http://localhost/api/v1/centers?partnerId=$PARTNERS&page=1&limit=1" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); c=d['data']['centers'][0]; print(c['id'])" 2>/dev/null)

echo "Center: $CENTERS"

# Test instant notification (manual request)
if [ -n "$PARTNERS" ] && [ -n "$CENTERS" ]; then
  RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "http://localhost/api/v1/admin/refurbishment/schedule-notification" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"partnerId\": \"$PARTNERS\",
      \"centerId\": \"$CENTERS\",
      \"frequency\": \"instant\",
      \"message\": \"Test instant request\",
      \"packages\": [],
      \"upgradation_packages\": [],
      \"isManualRequest\": true
    }")
  echo "Schedule-notification response: $RESULT"
else
  echo "Could not get partner/center IDs"
fi
