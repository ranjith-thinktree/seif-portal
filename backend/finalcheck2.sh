#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seif.org","password":"Password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

echo "Login: ${TOKEN:0:30}..."
AUTH="Authorization: Bearer $TOKEN"

echo "=== FINAL ENDPOINT VERIFICATION ==="
check() {
  code=$(curl -s -o /dev/null -w "%{http_code}" "$1" -H "$AUTH")
  echo "$code  $1"
}

check "http://localhost/health"
check "http://localhost/api/v1/notifications"
check "http://localhost/api/v1/dashboard/admin"
check "http://localhost/api/v1/partners?page=1&limit=5"
check "http://localhost/api/v1/centers?page=1&limit=5"
check "http://localhost/api/v1/uploads"
check "http://localhost/api/v1/batches?page=1&limit=5"
check "http://localhost/api/v1/students?page=1&limit=5"
check "http://localhost/api/v1/admin/refurbishment/packages?category=refurbishment"
check "http://localhost/api/v1/admin/refurbishment/requests?page=1&limit=10"
check "http://localhost/api/v1/partner/refurbishment/requests"
echo "=== DONE ==="
