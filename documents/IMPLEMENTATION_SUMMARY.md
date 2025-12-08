# Center-Wise Upload Review Implementation

## Overview
Implemented comprehensive center-wise upload approval workflow allowing admins to approve/reject individual centers from an upload, with granular progress tracking and partner notifications.

## Features Implemented

### 1. Backend Services
✅ **review.service.js** - Complete business logic for center-wise review
- `getUploadForReview()` - Fetch upload with review statistics
- `getPendingCenters()` - List centers with pagination/search
- `getCenterStudentsForReview()` - Show students for specific center
- `approveCenter()` - Transaction-based approval, moves data to main tables
- `rejectCenter()` - Mark center as rejected with reason/remarks
- `getRejectedCentersForPartner()` - Partner view of rejected data

### 2. Backend Controllers & Routes
✅ **review.controller.js** - HTTP request handlers
✅ **review.validator.js** - UUID and rejection reason validation
✅ **review.routes.js** - 6 routes with authentication and role authorization
✅ Routes mounted at `/api/v1/review`

### 3. API Endpoints
- `GET /api/v1/review/:uploadId` - Get upload details
- `GET /api/v1/review/:uploadId/centers` - List centers for review
- `GET /api/v1/review/:uploadId/centers/:centerId/students` - Get students
- `POST /api/v1/review/:uploadId/centers/:centerId/approve` - Approve center
- `POST /api/v1/review/:uploadId/centers/:centerId/reject` - Reject center
- `GET /api/v1/review/:uploadId/rejected` - Partner view (rejected centers)

### 4. Database Schema
⚠️ **Migration NOT yet applied** - File created at:
`backend/src/database/migrations/add_center_review_tracking.sql`

**Tables Modified:**
- `uploaded_centers` - Added review_status, rejection_reason, rejection_remarks, reviewed_by, reviewed_at
- `uploaded_batches` - Added review_status, reviewed_by, reviewed_at
- `uploaded_students` - Added review_status, reviewed_by, reviewed_at
- `uploaded_data` - Added centers_total, centers_reviewed, centers_approved, centers_rejected, review_progress

### 5. Frontend Service
✅ **review.service.js** - API client with 6 methods
- Axios-based HTTP calls to review endpoints
- Consistent error handling

### 6. Frontend Components
✅ **ReviewCentersPage.jsx** - Admin view to see centers from an upload
- Search/filter centers by name, city, state
- Pagination support
- Status badges (pending/approved/rejected)
- Click pending center → navigate to students

✅ **ReviewStudentsPage.jsx** - Students list with approve/reject buttons
- Shows all students for selected center
- Search/pagination
- **Approve Center** button (green) - Confirms and approves
- **Reject Center** button (red) - Opens modal for reason + remarks
- Auto-redirect to centers list after review
- Auto-redirect to inbox when all centers reviewed

✅ **RejectedUploadsPage.jsx** - Partner view of rejected centers
- Lists all rejected centers for an upload
- Shows rejection_reason and rejection_remarks
- Displays reviewer name and date
- Action required notice

### 7. Routing
✅ **Routes added:**
- `/review-centers/:uploadId` → ReviewCentersPage
- `/review-centers/:uploadId/students/:centerId` → ReviewStudentsPage
- `/rejected/:uploadId` → RejectedUploadsPage

✅ **Navigation updated:**
- InboxPage "Review Data" button → `/review-centers/${uploadId}`

## Workflow

### Admin Workflow:
1. Partner uploads data → Admin gets notification
2. Admin clicks "Review Data" → Navigate to `/review-centers/{uploadId}`
3. View list of centers with search/filter
4. Click center → View students at `/review-centers/{uploadId}/students/{centerId}`
5. Click "Approve Center" → Data moved to main tables, partner notified
6. Click "Reject Center" → Enter reason (min 10 chars) + optional remarks
7. After all centers reviewed → Auto-redirect to inbox

### Partner Workflow:
1. Partner gets notification for approved center
2. Partner gets notification for rejected center (with reason)
3. Click rejection notification → View `/rejected/{uploadId}`
4. See all rejected centers with reasons and remarks
5. Correct data and re-upload

## Technical Highlights

### Transaction Safety
- Approve/reject operations use MySQL transactions
- Rollback on any error ensures data consistency
- Batch ID mapping for foreign key integrity

### Progress Tracking
- Upload-level statistics: total, reviewed, approved, rejected
- `review_progress` field: 'in_progress' or 'completed'
- Auto-complete when all centers reviewed

### Audit Trail
- `reviewed_by` (FK to users table)
- `reviewed_at` timestamp
- Tracks who reviewed each center and when

### Security
- UUID validation on all parameters
- Partner ownership checks (getRejectedCenters)
- Role-based authorization (ADMIN/SUPER_ADMIN only for review)
- Review status validation (can't approve/reject already-reviewed centers)

### Notifications
- Created for partner on each center approval
- Created for partner on each center rejection
- Includes rejection reason in notification content
- Links to rejection view page

## Testing Checklist

### Backend Testing (Manual/Postman):
- [ ] Apply database migration in phpMyAdmin
- [ ] GET /api/v1/review/:uploadId (verify statistics)
- [ ] GET /api/v1/review/:uploadId/centers (verify pagination/search)
- [ ] GET /api/v1/review/:uploadId/centers/:centerId/students
- [ ] POST /api/v1/review/:uploadId/centers/:centerId/approve
  - [ ] Verify data moved to centers, batches, students tables
  - [ ] Verify notification created
  - [ ] Verify progress updated
- [ ] POST /api/v1/review/:uploadId/centers/:centerId/reject
  - [ ] Verify rejection_reason stored
  - [ ] Verify notification created
- [ ] GET /api/v1/review/:uploadId/rejected (as partner)

### Frontend Testing:
- [ ] Partner uploads CSV data
- [ ] Admin receives notification
- [ ] Click "Review Data" → Navigate to centers list
- [ ] Search centers by name
- [ ] Click center → View students
- [ ] Click "Approve Center" → Success message, return to centers list
- [ ] Click "Reject Center" → Modal opens
- [ ] Enter reason < 10 chars → Error
- [ ] Enter reason ≥ 10 chars → Success, return to centers list
- [ ] Approve/reject all centers → Auto-redirect to inbox
- [ ] Partner receives approval notification
- [ ] Partner receives rejection notification
- [ ] Partner clicks rejection notification → View rejected centers page
- [ ] Verify rejection reason and remarks displayed

### Edge Cases:
- [ ] Try to approve already-approved center (should fail)
- [ ] Try to reject already-rejected center (should fail)
- [ ] Partner tries to access another partner's rejected upload (should fail)
- [ ] Search with no results
- [ ] Pagination with 100+ centers
- [ ] Leave review incomplete, return later (progress persists)

## Known Limitations

1. **Migration Manual Application**: Database migration must be manually applied via phpMyAdmin
2. **No Bulk Actions**: Cannot approve/reject multiple centers at once
3. **No Edit After Review**: Cannot change review status once approved/rejected
4. **No Center Details View**: Rejected centers show summary only, no detailed view

## Future Enhancements

1. **Bulk Approve/Reject**: Select multiple centers for batch operations
2. **Review History**: View all reviews by an admin user
3. **Center Comparison**: Compare rejected vs corrected data side-by-side
4. **Email Notifications**: Send emails in addition to in-app notifications
5. **Comments**: Allow admin to add comments beyond rejection reason
6. **Re-review**: Allow changing review status if needed

## Files Modified/Created

### Backend:
- `backend/src/api/v1/services/review.service.js` (NEW - 450+ lines)
- `backend/src/api/v1/controllers/review.controller.js` (NEW - 180 lines)
- `backend/src/api/v1/validators/review.validator.js` (NEW - 40 lines)
- `backend/src/api/v1/routes/review.routes.js` (NEW - 80 lines)
- `backend/src/api/v1/routes/index.js` (MODIFIED - added review routes)
- `backend/src/database/migrations/add_center_review_tracking.sql` (NEW)

### Frontend:
- `frontend/src/services/review.service.js` (NEW - 90 lines)
- `frontend/src/pages/Review/ReviewCentersPage.jsx` (NEW - 250 lines)
- `frontend/src/pages/Review/ReviewStudentsPage.jsx` (NEW - 320 lines)
- `frontend/src/pages/Review/RejectedUploadsPage.jsx` (NEW - 180 lines)
- `frontend/src/pages/Review/index.js` (MODIFIED - added exports)
- `frontend/src/constants/routes.js` (MODIFIED - added 3 routes)
- `frontend/src/routes/AppRoutes.jsx` (MODIFIED - added 3 route mappings)
- `frontend/src/pages/Inbox/NotificationDetailCard.jsx` (MODIFIED - updated navigation)

## Next Steps

### CRITICAL (Must do before testing):
1. **Apply Database Migration**
   - Open phpMyAdmin
   - Select `seif` database
   - Go to SQL tab
   - Copy/paste contents from: `backend/src/database/migrations/add_center_review_tracking.sql`
   - Click "Go"
   - Verify all columns added successfully

### Recommended:
2. Test backend endpoints via Postman
3. Test frontend review workflow end-to-end
4. Verify notifications are created correctly
5. Test as both admin and partner users
6. Verify audit trail data is captured

---

**Status**: Implementation complete, ready for database migration and testing
**Estimated Testing Time**: 30-45 minutes
**Lines of Code**: ~1,800 new lines across 10 files
