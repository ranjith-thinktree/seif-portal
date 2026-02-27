#!/bin/bash
DB_HOST="database-1.cz2es426aqp2.ap-south-2.rds.amazonaws.com"
DB_PASS="ThinkTree2025"

echo "=== Step 1: Drop and recreate clean database ==="
mysql -h $DB_HOST -P 3306 -u admin -p$DB_PASS -e "DROP DATABASE IF EXISTS seif; CREATE DATABASE seif CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"

echo "=== Step 2: Strip DEFINER clauses ==="
sed 's/DEFINER=[^ ]* //g' /home/ubuntu/Database.sql > /home/ubuntu/Database_clean.sql

echo "=== Step 3: Remove TRIGGER blocks (will reimport after data load) ==="
python3 << 'PYEOF'
import re
with open('/home/ubuntu/Database_clean.sql', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
# Remove DELIMITER $$ ... DELIMITER ; blocks containing CREATE TRIGGER
pattern = r'DELIMITER \$\$.*?DELIMITER ;'
cleaned = re.sub(pattern, '', content, flags=re.DOTALL)
with open('/home/ubuntu/Database_notriggers.sql', 'w', encoding='utf-8') as f:
    f.write(cleaned)
triggers_removed = len(re.findall(r'CREATE TRIGGER', content))
print(f"Removed {triggers_removed} trigger(s). Lines: {len(cleaned.splitlines())}")
PYEOF

echo "=== Step 4: Importing database WITHOUT triggers ==="
mysql -h $DB_HOST -P 3306 -u admin -p$DB_PASS seif < /home/ubuntu/Database_notriggers.sql

if [ $? -eq 0 ]; then
    echo "=== Step 5: Verifying ==="
    mysql -h $DB_HOST -P 3306 -u admin -p$DB_PASS seif -e "SELECT COUNT(*) AS total_tables FROM information_schema.tables WHERE table_schema='seif';"
    mysql -h $DB_HOST -P 3306 -u admin -p$DB_PASS seif -e "SELECT COUNT(*) AS centers FROM centers; SELECT COUNT(*) AS partners FROM partners; SELECT COUNT(*) AS students FROM students;"
    echo "✅ DATABASE IMPORT COMPLETE!"
else
    echo "❌ Import failed"
fi
