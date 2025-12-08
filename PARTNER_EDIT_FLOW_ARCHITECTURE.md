# Partner Edit Flow - System Architecture

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PARTNER EDIT FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   Partner User  │
└────────┬────────┘
         │
         │ 1. Gets rejection notification
         ▼
┌─────────────────────────────────┐
│  Inbox - Notification List       │
│  • Shows rejected upload alert   │
│  • Click "Review Data" button    │
└────────┬────────────────────────┘
         │
         │ 2. Navigate based on status
         ▼
┌─────────────────────────────────┐
│  RejectedUploadsPage             │
│  • Shows rejection reasons       │
│  • Per-center rejection details  │
│  • "Review & Edit Data" button   │ ← Green button (NEW)
└────────┬────────────────────────┘
         │
         │ 3. Click to edit
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PartnerReviewEditPage (/my-data/review/:uploadId)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  HEADER SECTION                                                      │   │
│  │  • Upload filename, date                                             │   │
│  │  • Total centers count                                               │   │
│  │  • Rejected centers badge (if any)                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CENTERS GRID                                                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │   │
│  │  │ Center 1 │  │ Center 2 │  │ Center 3 │                          │   │
│  │  │ Approved │  │ REJECTED │  │ Pending  │  ← Click to select       │   │
│  │  │ ✓ Green  │  │ ✗ Red    │  │ ○ Orange │                          │   │
│  │  └──────────┘  └──────────┘  └──────────┘                          │   │
│  │  • Shows rejection reason inline for rejected centers               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STUDENTS TABLE (ag-grid) - Selected Center                         │   │
│  │  [Edit Button] [Re-submit Button]                                   │   │
│  │                                                                       │   │
│  │  S.No │ Name      │ Gender │ DOB        │ Mobile     │ Email  │...  │   │
│  │  ─────┼───────────┼────────┼────────────┼────────────┼────────┼───  │   │
│  │  1    │ John Doe  │ Male   │ 01/01/2000 │ 9876543210 │ j@e.com│     │   │
│  │  2    │ Jane Smith│ Female │ 02/02/2001 │ 9876543211 │ ja@e.c │     │   │
│  │  3    │ Bob Brown │ Male   │ 03/03/2002 │ 9876543212 │ b@e.com│     │   │
│  │                                                                       │   │
│  │  • Single-click to edit cells                                        │   │
│  │  • Yellow highlight for edited rows                                  │   │
│  │  • Gender dropdown (Male/Female/Other)                               │   │
│  │  • Shows edit count: "5 edited rows"                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
         4. Click "Re-submit"      │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BACKEND API: POST /api/v1/uploads/:uploadId/resubmit                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Request Body:                                                       │   │
│  │  {                                                                   │   │
│  │    "editedStudents": [                                               │   │
│  │      { "id": "uuid", "student_name": "Updated Name", ... }           │   │
│  │    ]                                                                 │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  TRANSACTION STEPS:                                                          │
│  1. Get original upload details                                              │
│  2. Create new upload (version + 1, parent_upload_id = original)            │
│  3. Copy all centers from original                                           │
│  4. Copy all batches from original                                           │
│  5. Copy all students (with edits applied)                                   │
│  6. Log each field change to data_edit_logs ───────────┐                    │
│  7. Create admin notification                          │                    │
│  8. Commit transaction                                 │                    │
└────────────────────────────────────────┬───────────────┼────────────────────┘
                                         │               │
         5. Success response             │               │
                                         ▼               ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────────┐
│  Response:                       │  │  Database Changes:                   │
│  {                               │  │  ┌─────────────────────────────────┐ │
│    "success": true,              │  │  │ data_uploads                    │ │
│    "data": {                     │  │  │ • New row: version=2            │ │
│      "newUploadId": "uuid",      │  │  │ • parent_upload_id=original_id  │ │
│      "version": 2,               │  │  │ • status='pending'              │ │
│      "totalEdits": 5             │  │  └─────────────────────────────────┘ │
│    }                             │  │  ┌─────────────────────────────────┐ │
│  }                               │  │  │ data_edit_logs                  │ │
│                                  │  │  │ • 1 row per field change        │ │
│  Toast: "Version 2 created!"     │  │  │ • old_value, new_value tracked  │ │
│  Navigate to Upload History      │  │  │ • edited_by = partner_user_id   │ │
└──────────────────────────────────┘  │  └─────────────────────────────────┘ │
                                      │  ┌─────────────────────────────────┐ │
                                      │  │ notifications                   │ │
                                      │  │ • Admin notification created    │ │
                                      │  │ • "Version 2 resubmitted"       │ │
                                      │  └─────────────────────────────────┘ │
                                      └─────────────────────────────────────┘

┌─────────────────────────────────┐
│  Admin Receives Notification     │
│  • Real-time WebSocket push      │
│  • Inbox notification appears    │
│  • "Version 2" badge shown       │
│  • Click to review new version   │
└─────────────────────────────────┘
```

---

## Data Flow

### 1. Original Upload (Version 1)

```
Upload ID: abc-123
Version: 1
Parent Upload ID: NULL
Status: rejected
Centers: 3
Students: 100
```

### 2. After Resubmission (Version 2)

```
Upload ID: def-456 (NEW)
Version: 2
Parent Upload ID: abc-123 (points to original)
Status: pending
Centers: 3 (copied from original)
Students: 100 (copied with 5 edits applied)
```

### 3. Edit Logs Created

```sql
data_edit_logs:
┌────────┬──────────┬──────────┬────────────┬──────────────┬───────────┬───────────┐
│ id     │ upload_id│ original │ student_id │ field_name   │ old_value │ new_value │
├────────┼──────────┼──────────┼────────────┼──────────────┼───────────┼───────────┤
│ log-1  │ def-456  │ abc-123  │ student-1  │ mobile_number│ 9876543210│ 9999999999│
│ log-2  │ def-456  │ abc-123  │ student-2  │ email        │ old@e.com │ new@e.com │
│ log-3  │ def-456  │ abc-123  │ student-2  │ student_name │ John Doe  │ John Smith│
└────────┴──────────┴──────────┴────────────┴──────────────┴───────────┴───────────┘
```

---

## Component Hierarchy

```
PartnerReviewEditPage
├── MainLayout
│   ├── Header
│   └── Sidebar
├── Breadcrumb
├── Header Section
│   ├── Upload Info
│   └── Rejected Badge
├── Centers Grid
│   └── Center Cards (map)
│       ├── Center Name
│       ├── Status Badge
│       ├── Student Count
│       └── Rejection Reason (if rejected)
├── Students Table Section
│   ├── Header with Edit/Resubmit buttons
│   └── AgGridReact
│       ├── Column Definitions (13 columns)
│       ├── Row Data (students)
│       └── Cell Editing
└── Back Button
```

---

## State Management

```javascript
// Upload data state
const [data, setData] = useState(null);
// Structure:
// {
//   upload: { id, file_name, uploaded_at, ... },
//   centers: [
//     { id, center_name, city, state, review_status, rejection_reason, ... }
//   ]
// }

// Selected center state
const [selectedCenter, setSelectedCenter] = useState(null);
// Single center object from data.centers

// Students for selected center
const [students, setStudents] = useState([]);
// Array of student objects with all fields

// Edit mode toggle
const [isEditing, setIsEditing] = useState(false);
// true = cells are editable, false = read-only

// Track which rows were edited
const [editedRows, setEditedRows] = useState(new Set());
// Set of row node IDs that have been modified

// Submission loading state
const [submitting, setSubmitting] = useState(false);
// true = resubmit in progress, false = idle
```

---

## API Endpoints

### Frontend → Backend

```
GET  /api/v1/review/:uploadId
     → Get upload details with all centers

GET  /api/v1/review/:uploadId/centers/:centerId/students
     → Get students for a specific center

POST /api/v1/uploads/:uploadId/resubmit
     → Resubmit with edited data (creates version 2)
     Body: { editedStudents: [...] }
```

### Backend → Database

```sql
-- Create new upload
INSERT INTO data_uploads (version=2, parent_upload_id=original)

-- Copy centers
INSERT INTO uploaded_centers SELECT ... WHERE data_upload_id = original

-- Copy batches
INSERT INTO uploaded_batches SELECT ... WHERE uploaded_center_id IN (...)

-- Insert students with edits
INSERT INTO uploaded_students VALUES (edited_values)

-- Log each edit
INSERT INTO data_edit_logs (field_name, old_value, new_value)

-- Notify admin
INSERT INTO notifications (type='upload', alert_type='info')
```

---

## Security & Validation

### Authorization

- Route protected by `authorize(['PARTNER'])`
- Only partner who owns the upload can resubmit
- Upload must exist and belong to partner

### Validation

- `editedStudents` must be non-empty array
- Each student must have valid `id` field
- Field names validated against allowed list
- Changes logged only if value differs

### Transaction Safety

- All operations wrapped in database transaction
- Rollback on any error
- Ensures data consistency

---

## Performance Considerations

### Frontend

- ag-grid handles large datasets efficiently
- Virtual scrolling for 1000+ rows
- Single-click editing (no double-click needed)
- Debounced cell value changes

### Backend

- Bulk inserts for copying data
- Transaction-based for ACID compliance
- Indexed foreign keys for fast lookups
- Pagination support for large uploads

---

## Future Enhancements

1. **Visual Diff:**

   - Show admin what changed between versions
   - Highlight edited cells in review page

2. **Batch Edit:**

   - Select multiple rows
   - Apply edit to all selected

3. **Edit History:**

   - Show partner their edit history
   - Undo capability before resubmit

4. **Version Timeline:**

   - Visual timeline of versions
   - Compare any two versions

5. **Export Edit Log:**
   - Download CSV of all edits
   - Audit trail for compliance
