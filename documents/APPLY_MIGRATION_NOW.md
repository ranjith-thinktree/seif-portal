# Apply This Migration in phpMyAdmin

## Step 1: Open phpMyAdmin
Navigate to http://localhost/phpmyadmin

## Step 2: Select Database
Click on the `seif` database in the left sidebar

## Step 3: Go to SQL Tab
Click the **SQL** tab at the top

## Step 4: Run This SQL

```sql
-- Add overall review progress tracking to data_uploads table
ALTER TABLE data_uploads
ADD COLUMN centers_total INT DEFAULT 0 COMMENT 'Total centers in this upload' AFTER total_records,
ADD COLUMN centers_reviewed INT DEFAULT 0 COMMENT 'Number of centers reviewed (approved or rejected)' AFTER centers_total,
ADD COLUMN centers_approved INT DEFAULT 0 COMMENT 'Number of centers approved' AFTER centers_reviewed,
ADD COLUMN centers_rejected INT DEFAULT 0 COMMENT 'Number of centers rejected' AFTER centers_approved,
ADD COLUMN review_progress ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started' COMMENT 'Overall review progress status' AFTER centers_rejected;

-- Add total_centers and total_students for better tracking
ALTER TABLE data_uploads
ADD COLUMN total_centers INT DEFAULT 0 COMMENT 'Total centers in upload' AFTER total_records,
ADD COLUMN total_batches INT DEFAULT 0 COMMENT 'Total batches in upload' AFTER total_centers,
ADD COLUMN total_students INT DEFAULT 0 COMMENT 'Total students in upload' AFTER total_batches;
```

## Step 5: Click "Go"
Execute the SQL

## Step 6: Verify
You should see success messages. Verify by running:

```sql
DESCRIBE data_uploads;
```

You should see the new columns:
- `centers_total`
- `centers_reviewed`
- `centers_approved`
- `centers_rejected`
- `review_progress`
- `total_centers`
- `total_batches`
- `total_students`

---

**Status**: Ready to apply ✅  
**Time Estimate**: 1-2 minutes
