# Quick Start: Apply Database Migration

## Step 1: Open phpMyAdmin

- Navigate to: http://localhost/phpmyadmin
- Login with your credentials

## Step 2: Select Database

- Click on `seif` database in left sidebar

## Step 3: Run Migration

- Click on "SQL" tab at the top
- Copy the entire contents from:
  `backend/src/database/migrations/006_add_data_edit_logs_and_versioning.sql`
- Paste into the SQL query box
- Click "Go" button

## Step 4: Verify Changes

Run these queries to verify:

```sql
-- Check if version columns added
DESCRIBE data_uploads;
-- Should see: version, parent_upload_id columns

-- Check if data_edit_logs table created
SHOW TABLES LIKE 'data_edit_logs';
-- Should return: data_edit_logs

-- Check table structure
DESCRIBE data_edit_logs;
-- Should see all columns: id, upload_id, original_upload_id, student_id, field_name, old_value, new_value, edited_by, created_at
```

## Expected Output

✅ Success message: "MySQL returned an empty result set"
✅ Green checkmark indicating successful execution

## Troubleshooting

### If you see "Table already exists" error:

The migration was already applied. Skip this step.

### If you see "Foreign key constraint fails":

Run the migration in two parts:

1. First run only the ALTER TABLE and CREATE TABLE statements
2. Then run the foreign key constraints separately

---

## Quick Test

After migration, test the partner edit flow:

1. **Login as Partner:**

   - Email: partner@testpartner.org
   - Password: Password123

2. **Navigate to Rejected Upload:**

   - Go to Inbox
   - Click on a rejected upload notification
   - Click "Review Data" button (should show rejected page)
   - Click "Review & Edit Data" button (new green button)

3. **Edit Data:**

   - Select a center from the grid
   - Click "Edit" button
   - Modify some cells in the ag-grid table
   - Click "Done"
   - Click "Re-submit"
   - Should see success message with version number

4. **Verify in Database:**

```sql
-- Check new upload created
SELECT id, file_name, version, parent_upload_id, status
FROM data_uploads
ORDER BY created_at DESC
LIMIT 5;

-- Check edit logs
SELECT * FROM data_edit_logs
ORDER BY created_at DESC;
```

---

## All Done! 🎉

The partner edit flow is now fully implemented and ready to use.
