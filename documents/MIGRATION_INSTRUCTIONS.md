# Database Migration Instructions

## CRITICAL: Apply This Migration Before Testing

The center-wise review system requires new database columns. Follow these steps:

## Step 1: Open phpMyAdmin
1. Open your browser and navigate to: http://localhost/phpmyadmin
2. Login with your MySQL credentials

## Step 2: Select Database
1. Click on the `seif` database in the left sidebar
2. Make sure you're in the correct database

## Step 3: Navigate to SQL Tab
1. Click the "SQL" tab at the top of the page
2. You should see a large text area for entering SQL commands

## Step 4: Copy Migration SQL
1. Open the file: `backend/src/database/migrations/add_center_review_tracking.sql`
2. Copy the entire contents (Ctrl+A, Ctrl+C)

## Step 5: Paste and Execute
1. Paste the SQL into the phpMyAdmin SQL text area (Ctrl+V)
2. Click the "Go" button in the bottom right
3. Wait for execution to complete

## Step 6: Verify Success
You should see messages like:
- "Query OK, X rows affected"
- 8 success messages total (4 tables × 2 ALTER statements each)

### Expected Output:
```
✓ uploaded_centers table altered (review fields)
✓ uploaded_centers table altered (rejection fields)
✓ uploaded_batches table altered (review fields)
✓ uploaded_students table altered (review fields)
✓ uploaded_data table altered (progress fields)
```

## Step 7: Verify Columns Added

### Check uploaded_centers table:
```sql
DESCRIBE uploaded_centers;
```
Should show new columns:
- `review_status` ENUM('pending', 'approved', 'rejected')
- `rejection_reason` TEXT
- `rejection_remarks` TEXT
- `reviewed_by` CHAR(36)
- `reviewed_at` TIMESTAMP

### Check uploaded_batches table:
```sql
DESCRIBE uploaded_batches;
```
Should show new columns:
- `review_status` ENUM('pending', 'approved', 'rejected')
- `reviewed_by` CHAR(36)
- `reviewed_at` TIMESTAMP

### Check uploaded_students table:
```sql
DESCRIBE uploaded_students;
```
Should show new columns:
- `review_status` ENUM('pending', 'approved', 'rejected')
- `reviewed_by` CHAR(36)
- `reviewed_at` TIMESTAMP

### Check uploaded_data table:
```sql
DESCRIBE uploaded_data;
```
Should show new columns:
- `centers_total` INT
- `centers_reviewed` INT
- `centers_approved` INT
- `centers_rejected` INT
- `review_progress` ENUM('in_progress', 'completed')

## Troubleshooting

### Error: "Column already exists"
- Migration was already applied
- Safe to ignore, or drop the columns and re-run

### Error: "Foreign key constraint fails"
- Check that `users` table exists
- Check that `users.id` column is CHAR(36)
- If needed, remove FOREIGN KEY constraints from migration

### Error: "Unknown database 'seif'"
- Make sure you selected the correct database
- Check database name in your .env file

### Error: "Access denied"
- Make sure you have ALTER TABLE privileges
- Login as root or database owner

## Rollback (if needed)

If you need to undo this migration:

```sql
-- Remove columns from uploaded_centers
ALTER TABLE uploaded_centers
DROP COLUMN review_status,
DROP COLUMN rejection_reason,
DROP COLUMN rejection_remarks,
DROP FOREIGN KEY fk_uploaded_centers_reviewed_by,
DROP COLUMN reviewed_by,
DROP COLUMN reviewed_at;

-- Remove columns from uploaded_batches
ALTER TABLE uploaded_batches
DROP COLUMN review_status,
DROP FOREIGN KEY fk_uploaded_batches_reviewed_by,
DROP COLUMN reviewed_by,
DROP COLUMN reviewed_at;

-- Remove columns from uploaded_students
ALTER TABLE uploaded_students
DROP COLUMN review_status,
DROP FOREIGN KEY fk_uploaded_students_reviewed_by,
DROP COLUMN reviewed_by,
DROP COLUMN reviewed_at;

-- Remove columns from uploaded_data
ALTER TABLE uploaded_data
DROP COLUMN centers_total,
DROP COLUMN centers_reviewed,
DROP COLUMN centers_approved,
DROP COLUMN centers_rejected,
DROP COLUMN review_progress;
```

## After Migration

Once migration is successfully applied:

1. ✅ Backend server will auto-restart (nodemon)
2. ✅ No code changes needed
3. ✅ Ready to test review workflow
4. ✅ Upload new data to test end-to-end

---

**Status**: Migration ready, awaiting application
**Estimated Time**: 2-3 minutes
