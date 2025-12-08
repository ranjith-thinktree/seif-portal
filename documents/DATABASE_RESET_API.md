# Database Reset API - Testing Guide

## ⚠️ WARNING: DESTRUCTIVE OPERATION

These endpoints will **DELETE ALL DATA** except:

- ✅ Users (all user accounts preserved)
- ✅ Courses (all course definitions preserved)
- ✅ Partners (partner organizations preserved)

Everything else will be **PERMANENTLY DELETED**:

- ❌ Centers, Batches, Students
- ❌ Data uploads and reviews
- ❌ Notifications
- ❌ Requests and refurbishments
- ❌ All logs

---

## 🔐 Authentication Required

**Role:** `SUPER_ADMIN` only

**Login as Super Admin:**

```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "superadmin@seif.org",
  "password": "Password123"
}
```

Copy the `accessToken` from the response.

---

## 📊 1. Get Database Statistics (Safe)

Check how much data exists before resetting:

```bash
GET http://localhost:5000/api/v1/admin/database-stats
Authorization: Bearer {your_access_token}
```

**PowerShell:**

```powershell
$headers = @{
    Authorization = "Bearer YOUR_TOKEN_HERE"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/database-stats" -Method Get -Headers $headers | ConvertTo-Json -Depth 5
```

**Response:**

```json
{
  "success": true,
  "message": "Database statistics fetched successfully",
  "data": {
    "users": 6,
    "partners": 1,
    "courses": 3,
    "centers": 7,
    "batches": 7,
    "students": 14,
    "data_uploads": 5,
    "uploaded_centers": 10,
    "uploaded_batches": 8,
    "uploaded_students": 25,
    "notifications": 11,
    "requests": 0
  }
}
```

---

## 🗑️ 2. Reset Database (DANGER!)

**⚠️ POINT OF NO RETURN**

This will truncate all operational data tables.

```bash
POST http://localhost:5000/api/v1/admin/reset-database
Authorization: Bearer {your_access_token}
```

**PowerShell:**

```powershell
$headers = @{
    Authorization = "Bearer YOUR_TOKEN_HERE"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/reset-database" -Method Post -Headers $headers | ConvertTo-Json -Depth 5
```

**Response:**

```json
{
  "success": true,
  "message": "Database reset completed successfully",
  "data": {
    "success": true,
    "truncatedTables": [
      "data_edit_logs",
      "uploaded_students",
      "uploaded_batches",
      "uploaded_centers",
      "data_uploads",
      "students",
      "batches",
      "center_courses",
      "centers",
      "notifications",
      "request_comments",
      "request_attachments",
      "scheduled_requests",
      "requests",
      "refurbishment_request_course_attachments",
      "refurbishment_request_course_packages",
      "refurbishment_admin_selected_packages",
      "refurbishment_upgradation_photos",
      "refurbishment_upgradation_rooms",
      "refurbishment_request_packages",
      "refurbishment_requests",
      "download_logs",
      "audit_logs",
      "password_resets",
      "password_reset_requests"
    ],
    "skippedTables": [],
    "totalTruncated": 25,
    "preserved": [
      "users",
      "courses",
      "partners",
      "refurbishment_packages",
      "course_packages"
    ],
    "statsBefore": {
      "users": 6,
      "partners": 1,
      "courses": 3,
      "centers": 7,
      "batches": 7,
      "students": 14,
      "data_uploads": 5,
      "notifications": 11
    },
    "statsAfter": {
      "users": 6,
      "partners": 1,
      "courses": 3,
      "centers": 0,
      "batches": 0,
      "students": 0,
      "data_uploads": 0,
      "notifications": 0
    }
  }
}
```

---

## 🔄 Complete Reset Workflow

**Step 1: Login as Super Admin**

```powershell
$body = @{
    email = "superadmin@seif.org"
    password = "Password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"

$token = $response.data.accessToken
Write-Host "✅ Logged in. Token: $token"
```

**Step 2: Check Current Stats**

```powershell
$headers = @{ Authorization = "Bearer $token" }

$stats = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/database-stats" -Method Get -Headers $headers
Write-Host "`n📊 Current Database Stats:"
$stats.data | Format-Table
```

**Step 3: Confirm Reset (Manual Confirmation)**

```powershell
$confirm = Read-Host "`n⚠️  This will DELETE ALL DATA except users, courses, and partners. Type 'YES' to confirm"

if ($confirm -eq "YES") {
    Write-Host "`n🗑️  Resetting database..."
    $result = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/reset-database" -Method Post -Headers $headers

    Write-Host "`n✅ Reset Complete!"
    Write-Host "`nTruncated $($result.data.totalTruncated) tables"
    Write-Host "`n📊 Stats After Reset:"
    $result.data.statsAfter | Format-Table
} else {
    Write-Host "`n❌ Reset cancelled"
}
```

---

## 🔒 Security Features

1. **SUPER_ADMIN Only**: Only users with `SUPER_ADMIN` role can access these endpoints
2. **Double Check**: Controller verifies role again before executing
3. **Transaction Safety**: Uses database transactions with rollback on error
4. **Foreign Key Handling**: Temporarily disables FK checks for clean truncation
5. **Error Handling**: Non-existent tables are skipped gracefully

---

## 📝 What Gets Preserved

After reset, you can immediately:

- ✅ Login with all existing user accounts
- ✅ View course catalog (courses remain)
- ✅ Partner organization data is intact
- ✅ Start fresh data upload process

---

## 🚀 After Reset

You're now ready to:

1. Login as partner (`partner@testpartner.org` / `Password123`)
2. Upload fresh data via `/api/v1/uploads`
3. Admin can review and approve
4. Build up production data from scratch

---

## ⚠️ Important Notes

- **No Undo**: Once executed, data cannot be recovered (unless you have a database backup)
- **Production Warning**: NEVER run this on production without a backup
- **File Cleanup**: Uploaded CSV files in `backend/uploads/` are NOT deleted
- **Testing**: Ideal for development/testing when you want a clean slate

---

## 🔧 Troubleshooting

**Error: "Only SUPER_ADMIN can reset the database"**

- Solution: Login with `superadmin@seif.org` account

**Error: "Token expired"**

- Solution: Login again to get a fresh token

**Error: "Table doesn't exist"**

- Solution: Tables that don't exist are automatically skipped

---

## 🎯 Use Cases

1. **Development Testing**: Start fresh after testing upload/review flow
2. **Demo Reset**: Clean slate before product demonstration
3. **Bug Testing**: Reproduce issues with clean database
4. **Training**: Reset after training sessions

---

## 📚 Related Endpoints

- `POST /api/v1/auth/login` - Get authentication token
- `GET /api/v1/admin/database-stats` - Check data before/after reset
- `POST /api/v1/uploads` - Upload new data after reset
