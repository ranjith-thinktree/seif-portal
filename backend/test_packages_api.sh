#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seif.org","password":"Password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

echo "=== Packages API Response ==="
RESULT=$(curl -s "http://localhost/api/v1/admin/refurbishment/packages" \
  -H "Authorization: Bearer $TOKEN")
echo "$RESULT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('success:', d.get('success'))
pkgs=d.get('data',{}).get('packages',[])
print('packages_count:', len(pkgs))
if pkgs:
    p=pkgs[0]
    print('sample pkg keys:', list(p.keys()))
    print('sample:', p.get('name'), '| category:', p.get('category'))
"
echo ""
echo "=== Upgradation packages ==="
RESULT2=$(curl -s "http://localhost/api/v1/admin/refurbishment/packages?category=upgradation" \
  -H "Authorization: Bearer $TOKEN")
echo "$RESULT2" | python3 -c "
import sys,json
d=json.load(sys.stdin)
pkgs=d.get('data',{}).get('packages',[])
print('upgradation_count:', len(pkgs))
if pkgs:
    print('sample:', pkgs[0].get('name'))
"
