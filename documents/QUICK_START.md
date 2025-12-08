# Quick Start Guide - Center-Wise Review System

## 🚀 Getting Started

### Step 1: Apply Database Migration (REQUIRED)
Before testing anything, you MUST apply the database migration:

1. Open **phpMyAdmin** (http://localhost/phpmyadmin)
2. Select the `seif` database
3. Click the **SQL** tab
4. Open: `backend/src/database/migrations/add_center_review_tracking.sql`
5. Copy the entire file contents
6. Paste into phpMyAdmin SQL tab
7. Click **Go**
8. Verify success (should see 8 success messages)

⚠️ **Without this migration, the review system will not work!**

### Step 2: Start Backend Server (if not running)
```powershell
cd backend
npm run dev
```
Backend will run on: http://localhost:5000

### Step 3: Start Frontend (if not running)
```powershell
cd frontend
npm run dev
```
Frontend will run on: http://localhost:5173

---

## 📋 Testing the Complete Workflow

### As Admin User:

#### 1. Check Inbox for Notifications
- Login as admin
- Navigate to Inbox (`/inbox`)
- Look for "New Data uploaded" notifications from partners

#### 2. Review Centers
- Click **"Review Data"** button on a notification
- Should navigate to `/review-centers/{uploadId}`
- See list of centers from that upload
- **Features to test:**
  - Search centers by name, city, or state
  - Pagination (if more than 10 centers)
  - Status badges (Pending/Approved/Rejected)
  - Center statistics in header

#### 3. View Students for a Center
- Click on any **pending** center row
- Should navigate to `/review-centers/{uploadId}/students/{centerId}`
- See all students for that center
- **Features to test:**
  - Search students by enrollment ID, name, or email
  - Pagination
  - Student details display

#### 4. Approve a Center
- Click **"Approve Center"** (green button)
- Confirm in dialog
- Should see success message
- **Verify:**
  - Data moved to `centers`, `batches`, `students` tables
  - Partner receives approval notification
  - Progress updated in upload
  - Buttons disappear (center no longer editable)
  - Automatically return to centers list

#### 5. Reject a Center
- Go to another center's students page
- Click **"Reject Center"** (red button)
- Enter rejection reason (minimum 10 characters)
- Optionally add remarks
- Click **"Confirm Rejection"**
- **Verify:**
  - Success message shown
  - Partner receives rejection notification
  - Rejection reason stored
  - Return to centers list

#### 6. Complete Review (All Centers)
- Approve or reject all remaining centers
- After last center review → Auto-redirect to inbox
- See success message: "All centers reviewed!"

### As Partner User:

#### 1. Upload Data (if needed)
- Login as partner
- Navigate to Upload (`/upload`)
- Upload a CSV file
- Verify notification sent to admin

#### 2. Check Approved Notifications
- Go to Inbox
- Look for "Data Approved" notifications
- Click notification → See approved data details

#### 3. View Rejected Centers
- Go to Inbox
- Look for "Data Rejected" notifications
- Click notification → Navigate to `/rejected/{uploadId}`
- **Verify:**
  - See all rejected centers
  - See rejection reasons for each
  - See additional remarks (if any)
  - See reviewer name and date

---

## 🔧 API Endpoint Testing (Postman/Thunder Client)

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
Add header to all requests:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### 1. Get Upload for Review
```
GET /review/:uploadId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "upload-uuid",
    "partner_name": "ABC Foundation",
    "uploaded_by_name": "John Doe",
    "uploaded_at": "2024-01-15T10:30:00Z",
    "centers_total": 5,
    "centers_reviewed": 2,
    "centers_approved": 1,
    "centers_rejected": 1
  }
}
```

### 2. Get Centers for Review
```
GET /review/:uploadId/centers?page=1&limit=10&search=delhi
```

### 3. Get Students for Center
```
GET /review/:uploadId/centers/:centerId/students?page=1&limit=10
```

### 4. Approve Center
```
POST /review/:uploadId/centers/:centerId/approve
```
**Response:**
```json
{
  "success": true,
  "message": "Center approved successfully",
  "data": {
    "success": true,
    "approvedCenterId": "new-uuid",
    "allReviewed": false
  }
}
```

### 5. Reject Center
```
POST /review/:uploadId/centers/:centerId/reject
Content-Type: application/json

{
  "reason": "Incomplete student data for batch 2024-01",
  "remarks": "Please ensure all required fields are filled"
}
```

### 6. Get Rejected Centers (Partner)
```
GET /review/:uploadId/rejected
```

---

## 🗃️ Database Verification

### Check if migration applied:
```sql
-- Check uploaded_centers has review columns
DESCRIBE uploaded_centers;

-- Check for review_status enum
SHOW COLUMNS FROM uploaded_centers LIKE 'review_status';
```

### Verify data after approval:
```sql
-- Check if data moved to main tables
SELECT * FROM centers WHERE created_at > NOW() - INTERVAL 5 MINUTE;
SELECT * FROM batches WHERE created_at > NOW() - INTERVAL 5 MINUTE;
SELECT * FROM students WHERE created_at > NOW() - INTERVAL 5 MINUTE;

-- Check review tracking
SELECT 
  uc.center_name,
  uc.review_status,
  uc.rejection_reason,
  u.first_name as reviewed_by,
  uc.reviewed_at
FROM uploaded_centers uc
LEFT JOIN users u ON uc.reviewed_by = u.id
WHERE uc.upload_id = 'YOUR_UPLOAD_ID';
```

### Check progress tracking:
```sql
SELECT 
  file_name,
  centers_total,
  centers_reviewed,
  centers_approved,
  centers_rejected,
  review_progress
FROM uploaded_data
WHERE id = 'YOUR_UPLOAD_ID';
```

---

## 🐛 Troubleshooting

### Issue: "Failed to load upload details"
**Solution:** 
- Check uploadId is valid
- Verify upload exists and status is 'pending'
- Check user has admin role

### Issue: "Failed to approve center"
**Solution:**
- Check center review_status is 'pending' (not already reviewed)
- Verify database migration applied
- Check foreign key constraints
- Review backend console for errors

### Issue: Components not displaying
**Solution:**
- Check browser console for errors
- Verify all routes added to AppRoutes.jsx
- Check ROUTES constants match route paths
- Clear browser cache and reload

### Issue: Navigation not working
**Solution:**
- Verify notification has `related_entity_id`
- Check route patterns match (`:uploadId`, `:centerId`)
- Ensure all `.replace()` calls use correct param names

### Issue: Breadcrumb not showing
**Solution:**
- Breadcrumb component exists at `frontend/src/components/common/Breadcrumb.jsx`
- Import uses correct name (Breadcrumb, not Breadcrumbs)
- Items array passed correctly

---

## ✅ Success Criteria

- [ ] Database migration applied successfully
- [ ] Admin can view centers from upload
- [ ] Admin can view students for each center
- [ ] Approve button works and moves data to main tables
- [ ] Reject button stores reason and creates notification
- [ ] Partner receives notifications for approved/rejected centers
- [ ] Partner can view rejected centers with reasons
- [ ] Progress tracking updates correctly
- [ ] Auto-redirect to inbox when all centers reviewed
- [ ] Partial reviews supported (can leave and return)
- [ ] Search and pagination work correctly

---

## 📊 Expected Data Flow

```
1. Partner uploads CSV
   └─> Creates records in uploaded_data, uploaded_centers, uploaded_batches, uploaded_students
   └─> Creates notification for admin (type: DATA_PENDING_APPROVAL)

2. Admin clicks "Review Data"
   └─> Navigate to /review-centers/{uploadId}
   └─> List all centers with review_status = 'pending'

3. Admin clicks center
   └─> Navigate to /review-centers/{uploadId}/students/{centerId}
   └─> Show students for that center

4a. Admin approves center
   └─> Generate new UUIDs for center, batches, students
   └─> INSERT into main tables (centers, batches, students)
   └─> UPDATE review_status = 'approved' in uploaded_* tables
   └─> UPDATE progress tracking in uploaded_data
   └─> CREATE notification for partner (type: DATA_APPROVED)

4b. Admin rejects center
   └─> UPDATE review_status = 'rejected' in uploaded_* tables
   └─> STORE rejection_reason and rejection_remarks
   └─> UPDATE progress tracking in uploaded_data
   └─> CREATE notification for partner (type: DATA_REJECTED)

5. Partner views notifications
   └─> Approved: See approval confirmation
   └─> Rejected: Click → Navigate to /rejected/{uploadId}
   └─> View rejection details and fix data for re-upload
```

---

## 📁 Quick File Reference

### Backend:
- Service: `backend/src/api/v1/services/review.service.js`
- Controller: `backend/src/api/v1/controllers/review.controller.js`
- Routes: `backend/src/api/v1/routes/review.routes.js`
- Validators: `backend/src/api/v1/validators/review.validator.js`
- Migration: `backend/src/database/migrations/add_center_review_tracking.sql`

### Frontend:
- Service: `frontend/src/services/review.service.js`
- Centers Page: `frontend/src/pages/Review/ReviewCentersPage.jsx`
- Students Page: `frontend/src/pages/Review/ReviewStudentsPage.jsx`
- Rejected Page: `frontend/src/pages/Review/RejectedUploadsPage.jsx`
- Routes: `frontend/src/routes/AppRoutes.jsx`
- Constants: `frontend/src/constants/routes.js`

---

**Status**: Ready for testing ✅  
**Prerequisites**: Database migration applied ✅  
**Estimated Testing Time**: 30-45 minutes  
