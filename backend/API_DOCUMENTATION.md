# Data Management API Documentation

## Overview

Complete backend API for hierarchical data management system with role-based access control, approval workflows, and CSV export capabilities.

**Base URL:** `http://localhost:5000/api/v1`

**Authentication:** All endpoints require JWT token in Authorization header

```
Authorization: Bearer <token>
```

---

## Role-Based Permissions

| Role              | Access Level                                                      |
| ----------------- | ----------------------------------------------------------------- |
| **SUPER_ADMIN**   | Full access to all endpoints, approve/reject partners and centers |
| **ADMIN**         | Full access to all endpoints, approve/reject partners and centers |
| **PARTNER**       | Access to own centers, batches, and students only                 |
| **ESSCI**         | Read-only access + CSV export (no SEIF_READONLY restriction)      |
| **SEIF_READONLY** | Read-only access, no exports                                      |

---

## Partners API

### 1. Get All Partners

**Endpoint:** `GET /partners`

**Access:** ADMIN, SUPER_ADMIN, ESSCI, SEIF_READONLY

**Query Parameters:**

- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10, max: 100) - Items per page
- `search` (optional) - Search in name, email, phone, city, state
- `status` (optional) - Filter by status: active, inactive
- `approval_status` (optional) - Filter by approval: pending, approved, rejected

**Response:**

```json
{
  "success": true,
  "message": "Partners retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Partner Name",
      "email": "partner@example.com",
      "phone": "1234567890",
      "address": "123 Street",
      "city": "City",
      "state": "State",
      "postal_code": "123456",
      "status": "active",
      "approval_status": "approved",
      "approved_by": "uuid",
      "approved_at": "2024-01-01T00:00:00.000Z",
      "approved_by_name": "Admin Name",
      "total_centers": 5,
      "total_students": 150,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### 2. Get Partner by ID

**Endpoint:** `GET /partners/:id`

**Access:** ADMIN, SUPER_ADMIN, ESSCI, SEIF_READONLY

**Response:** Same as single partner object above

### 3. Create Partner

**Endpoint:** `POST /partners`

**Access:** ADMIN, SUPER_ADMIN only

**Request Body:**

```json
{
  "name": "Partner Name",
  "email": "partner@example.com",
  "phone": "1234567890",
  "address": "123 Street",
  "city": "City",
  "state": "State",
  "postal_code": "123456",
  "status": "active"
}
```

**Validation Rules:**

- `name`: Required, string
- `email`: Optional, valid email format
- `phone`: Optional, exactly 10 digits
- `postal_code`: Optional, exactly 6 digits
- `status`: Optional, enum: active, inactive

**Response:** 201 Created with partner object

**Note:** Partners created by ADMIN/SUPER_ADMIN are auto-approved

### 4. Update Partner

**Endpoint:** `PUT /partners/:id`

**Access:** ADMIN, SUPER_ADMIN only

**Request Body:** Same as create (all fields optional)

**Response:** Updated partner object

### 5. Delete Partner

**Endpoint:** `DELETE /partners/:id`

**Access:** ADMIN, SUPER_ADMIN only

**Response:** Success message

**Error:** 400 if partner has centers (cascade protection)

### 6. Approve Partner

**Endpoint:** `PATCH /partners/:id/approve`

**Access:** ADMIN, SUPER_ADMIN only

**Response:** Approved partner object

**Error:** 400 if already approved

### 7. Reject Partner

**Endpoint:** `PATCH /partners/:id/reject`

**Access:** ADMIN, SUPER_ADMIN only

**Request Body:**

```json
{
  "rejection_reason": "Reason for rejection (10-500 characters)"
}
```

**Response:** Rejected partner object

### 8. Export Partners

**Endpoint:** `GET /partners/export`

**Access:** ADMIN, SUPER_ADMIN, ESSCI

**Query Parameters:** Same as Get All Partners (search, status, approval_status)

**Response:** CSV file download

---

## Centers API

### 1. Get All Centers

**Endpoint:** `GET /centers`

**Access:** All authenticated users

**Query Parameters:**

- `page`, `limit`, `search` (same as partners)
- `partner_id` (optional) - Filter by partner UUID
- `center_type` (optional) - Filter by type: Short Term, Long Term, ITI, Polytechnic
- `region` (optional) - Filter by region: North, South, East, West, Central
- `status` (optional) - active, inactive
- `approval_status` (optional) - pending, approved, rejected

**Response:** Similar structure to partners with center fields

**Role Filtering:**

- PARTNER: See only their own centers
- Others: See approved centers (admins see all)

### 2. Get My Centers

**Endpoint:** `GET /centers/my-centers`

**Access:** PARTNER only

**Query Parameters:** Same as Get All Centers

**Response:** Partner's centers only

### 3. Get Center by ID

**Endpoint:** `GET /centers/:id`

**Access:** All authenticated users

**Response:** Center object with `batches` array and statistics

### 4. Create Center

**Endpoint:** `POST /centers`

**Access:** ADMIN, SUPER_ADMIN, PARTNER

**Request Body:**

```json
{
  "partner_id": "uuid",
  "center_name": "Center Name",
  "center_type": "Short Term",
  "region": "North",
  "address": "123 Street",
  "city": "City",
  "state": "State",
  "pincode": "123456",
  "year_of_establishment": 2020,
  "latitude": 28.7041,
  "longitude": 77.1025,
  "contact_person_name": "John Doe",
  "contact_person_mobile": "1234567890",
  "contact_person_email": "john@example.com",
  "seating_capacity": 50,
  "status": "active"
}
```

**Validation Rules:**

- `partner_id`: Required, valid UUID
- `center_name`: Required, string
- `center_type`: Optional, enum: Short Term, Long Term, ITI, Polytechnic
- `region`: Optional, enum: North, South, East, West, Central
- `pincode`: Optional, exactly 6 digits
- `year_of_establishment`: Optional, 4-digit year
- `contact_person_mobile`: Optional, exactly 10 digits
- `contact_person_email`: Optional, valid email

**Note:**

- Centers created by ADMIN/SUPER_ADMIN are auto-approved
- Centers created by PARTNER have approval_status='pending'
- Partners are auto-assigned to their partner_id

**Response:** 201 Created with center object

### 5. Update Center

**Endpoint:** `PUT /centers/:id`

**Access:** ADMIN, SUPER_ADMIN, PARTNER (own centers only)

**Request Body:** Same as create (all fields optional)

**Response:** Updated center object

**Error:** 403 if PARTNER tries to update another partner's center

### 6. Delete Center

**Endpoint:** `DELETE /centers/:id`

**Access:** ADMIN, SUPER_ADMIN only

**Response:** Success message

**Error:** 400 if center has batches (cascade protection)

### 7. Approve Center

**Endpoint:** `PATCH /centers/:id/approve`

**Access:** ADMIN, SUPER_ADMIN only

**Response:** Approved center object

### 8. Reject Center

**Endpoint:** `PATCH /centers/:id/reject`

**Access:** ADMIN, SUPER_ADMIN only

**Request Body:**

```json
{
  "rejection_reason": "Reason for rejection (10-500 characters)"
}
```

**Response:** Rejected center object

### 9. Export Centers

**Endpoint:** `GET /centers/export`

**Access:** ADMIN, SUPER_ADMIN, ESSCI, PARTNER

**Query Parameters:** Same as Get All Centers

**Response:** CSV file download

---

## Batches API

### 1. Get All Batches

**Endpoint:** `GET /batches`

**Access:** All authenticated users

**Query Parameters:**

- `page`, `limit`, `search` (same as others)
- `center_id` (optional) - Filter by center UUID
- `partner_id` (optional) - Filter by partner UUID
- `status` (optional) - Filter by status: active, completed, cancelled

**Response:**

```json
{
  "success": true,
  "message": "Batches retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "center_id": "uuid",
      "partner_id": "uuid",
      "batch_number": "BATCH-001",
      "batch_start_date": "2024-01-01",
      "batch_complete_date": "2024-06-01",
      "total_students": 30,
      "male_students": 18,
      "female_students": 12,
      "status": "active",
      "center_name": "Center Name",
      "partner_name": "Partner Name",
      "enrolled_students": 30,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

**Role Filtering:**

- PARTNER: See only their own batches

### 2. Get Batches by Center

**Endpoint:** `GET /batches/by-center/:centerId`

**Access:** All authenticated users

**Response:** Array of batches for specified center

**Error:** 403 if PARTNER tries to access another partner's center

### 3. Get Batch by ID

**Endpoint:** `GET /batches/:id`

**Access:** All authenticated users

**Response:** Batch object with center details

**Error:** 403 if PARTNER tries to access another partner's batch

### 4. Create Batch

**Endpoint:** `POST /batches`

**Access:** ADMIN, SUPER_ADMIN, PARTNER

**Request Body:**

```json
{
  "center_id": "uuid",
  "partner_id": "uuid",
  "batch_number": "BATCH-001",
  "batch_start_date": "2024-01-01",
  "batch_complete_date": "2024-06-01",
  "total_students": 30,
  "male_students": 18,
  "female_students": 12,
  "status": "active"
}
```

**Validation Rules:**

- `center_id`: Required, valid UUID
- `partner_id`: Required, valid UUID (auto-set for PARTNER role)
- `batch_number`: Required, string
- `batch_start_date`: Required, ISO 8601 date
- `batch_complete_date`: Optional, ISO 8601 date
- `total_students`, `male_students`, `female_students`: Optional, positive integers
- `status`: Optional, enum: active, completed, cancelled

**Note:**

- Center must belong to the partner_id
- Partners are auto-assigned to their partner_id
- No approval workflow (batches are pre-approved)

**Response:** 201 Created with batch object

**Error:** 404 if center not found or doesn't belong to partner

### 5. Update Batch

**Endpoint:** `PUT /batches/:id`

**Access:** ADMIN, SUPER_ADMIN, PARTNER (own batches only)

**Request Body:** Same as create (all fields optional except center_id and partner_id)

**Response:** Updated batch object

**Error:**

- 404 if batch not found
- 403 if PARTNER tries to update another partner's batch

### 6. Delete Batch

**Endpoint:** `DELETE /batches/:id`

**Access:** ADMIN, SUPER_ADMIN only

**Response:** Success message

**Error:** 400 if batch has enrolled students (cascade protection)

---

## Students API

**Note:** Students are read-only. They are created from CSV approval workflow, not manually.

### 1. Get All Students

**Endpoint:** `GET /students`

**Access:** All authenticated users

**Query Parameters:**

- `page`, `limit`, `search` (search in enrollment_id, first_name, last_name, email, mobile)
- `center_id` (optional) - Filter by center UUID
- `batch_id` (optional) - Filter by batch UUID
- `partner_id` (optional) - Filter by partner UUID

**Response:**

```json
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "batch_id": "uuid",
      "center_id": "uuid",
      "partner_id": "uuid",
      "enrollment_id": "ENR-001",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "mobile_number": "1234567890",
      "date_of_birth": "2000-01-01",
      "gender": "Male",
      "category": "General",
      "qualification": "12th Pass",
      "guardian_name": "Parent Name",
      "guardian_number": "9876543210",
      "address": "123 Street",
      "city": "City",
      "state": "State",
      "pincode": "123456",
      "course_name": "Web Development",
      "trade_sector": "IT",
      "course_start_date": "2024-01-01",
      "course_end_date": "2024-06-01",
      "training_duration_months": 6,
      "assessment_date": "2024-06-15",
      "certification_date": "2024-06-30",
      "placement_status": "Placed",
      "company_name": "Tech Corp",
      "job_role": "Developer",
      "monthly_salary": 25000,
      "employment_type": "Full-time",
      "date_of_joining": "2024-07-01",
      "batch_number": "BATCH-001",
      "center_name": "Center Name",
      "partner_name": "Partner Name",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

**Role Filtering:**

- PARTNER: See only their own students

### 2. Get Students by Batch

**Endpoint:** `GET /students/by-batch/:batchId`

**Access:** All authenticated users

**Response:** Array of students for specified batch

**Error:** 403 if PARTNER tries to access another partner's batch

### 3. Get Student by ID

**Endpoint:** `GET /students/:id`

**Access:** All authenticated users

**Response:** Student object with batch, center, and partner details

**Error:**

- 404 if student not found
- 403 if PARTNER tries to access another partner's student

### 4. Export Students

**Endpoint:** `GET /students/export`

**Access:** ADMIN, SUPER_ADMIN, ESSCI, PARTNER

**Query Parameters:** Same as Get All Students

**Response:** CSV file download with all student fields

**Note:** SEIF_READONLY cannot export (per requirements)

---

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...},
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message"
}
```

### Common HTTP Status Codes

- `200 OK` - Successful GET/PUT/PATCH
- `201 Created` - Successful POST
- `400 Bad Request` - Validation error or cascade protection
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions or ownership violation
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate entry
- `500 Internal Server Error` - Server error

---

## Database Relationships

```
partners (id)
  ↓ (partner_id FK)
centers (id, partner_id, approval_status)
  ↓ (center_id FK)
batches (id, center_id, partner_id)
  ↓ (batch_id FK)
students (id, batch_id, center_id, partner_id)
```

**Cascade Deletion Protection:**

- Cannot delete partner if it has centers
- Cannot delete center if it has batches
- Cannot delete batch if it has enrolled students

**Approval Workflow:**

- Partners and Centers have approval_status: pending, approved, rejected
- Batches and Students do not require approval
- When created by ADMIN/SUPER_ADMIN: auto-approved
- When created by PARTNER: approval_status='pending'
- Non-admin users see only approved data (except partners see their own pending data)

---

## API Testing Guide

### 1. Authentication

First, login to get JWT token:

```bash
POST /api/v1/auth/login
{
  "email": "admin@example.com",
  "password": "password"
}
```

Use the returned token in all subsequent requests:

```
Authorization: Bearer <token>
```

### 2. Create Partner (Admin)

```bash
POST /api/v1/partners
{
  "name": "Test Partner",
  "email": "partner@test.com",
  "phone": "1234567890",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal_code": "400001",
  "status": "active"
}
```

### 3. Create Center (Partner or Admin)

```bash
POST /api/v1/centers
{
  "partner_id": "<partner_uuid>",
  "center_name": "Test Center",
  "center_type": "Short Term",
  "region": "West",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "contact_person_name": "John Doe",
  "contact_person_mobile": "9876543210",
  "status": "active"
}
```

### 4. Approve Center (Admin only)

```bash
PATCH /api/v1/centers/<center_uuid>/approve
```

### 5. Create Batch (Partner or Admin)

```bash
POST /api/v1/batches
{
  "center_id": "<center_uuid>",
  "partner_id": "<partner_uuid>",
  "batch_number": "BATCH-001",
  "batch_start_date": "2024-01-01",
  "total_students": 30,
  "status": "active"
}
```

### 6. View Students

```bash
GET /api/v1/students?batch_id=<batch_uuid>&page=1&limit=10
```

### 7. Export Data

```bash
GET /api/v1/partners/export?status=active
GET /api/v1/centers/export?partner_id=<uuid>
GET /api/v1/students/export?batch_id=<uuid>
```

---

## Frontend Integration Notes

### DataTable Components Needed

1. **Partners Page** (`/data/partners`)
   - List all partners with pagination
   - Create/Edit forms
   - Approve/Reject buttons (admin only)
   - Export CSV button

2. **Centers Page** (`/data/centers`)
   - List all centers with pagination
   - Filter by partner dropdown
   - Create/Edit forms
   - Approve/Reject buttons (admin only)
   - Export CSV button

3. **My Centers Page** (`/data/my-centers`) - Partner only
   - Use GET /centers/my-centers endpoint
   - Same features as Centers Page

4. **Center Details Page** (`/data/centers/:id`)
   - Center information
   - Batches table for this center
   - "Create Batch" button (opens modal)

5. **Students Page** (`/data/students`)
   - List all students with pagination
   - Filter by: Batch dropdown, Center dropdown
   - Search functionality
   - Export CSV button

### Breadcrumb Navigation

```
Partners → Partner Details → Centers → Center Details → Batches → Students
```

### Role-Based UI

- Hide create/edit/delete buttons for ESSCI and SEIF_READONLY
- Hide approve/reject buttons for non-admins
- Hide export button for SEIF_READONLY
- Show "My Centers" link only for PARTNER role

---

## Implementation Checklist

### Backend (✅ COMPLETED)

- ✅ Partners API (8 endpoints)
- ✅ Centers API (9 endpoints)
- ✅ Batches API (6 endpoints)
- ✅ Students API (4 endpoints)
- ✅ Role-based access control
- ✅ Approval workflows
- ✅ CSV export functionality
- ✅ Pagination and filtering
- ✅ Cascade protection
- ✅ Input validation

### Frontend (PENDING)

- ❌ Partners DataTable page
- ❌ Centers DataTable page
- ❌ My Centers page (partner)
- ❌ Center Details page
- ❌ Batch create form (modal)
- ❌ Students DataTable page
- ❌ Breadcrumb navigation
- ❌ CSV export buttons
- ❌ Approval buttons (admin)
- ❌ Role-based UI rendering

---

## Notes

1. **UUID Format**: All IDs use UUID v4 format stored as CHAR(36)

2. **Date Format**: All dates use ISO 8601 format (YYYY-MM-DD)

3. **CSV Export**:
   - Returns text/csv content type
   - Filename includes timestamp
   - All fields included in exports

4. **Role Hierarchy**:
   - SUPER_ADMIN = ADMIN (both have full access)
   - PARTNER < ADMIN (restricted to own data)
   - ESSCI = Read + Export
   - SEIF_READONLY = Read only

5. **Approval Flow**:
   - Admin creates → Auto-approved
   - Partner creates → Pending → Admin approves/rejects

6. **Search Functionality**:
   - Partners: name, email, phone, city, state
   - Centers: center_name, city, state, contact_person_name
   - Batches: batch_number, center_name, partner_name
   - Students: enrollment_id, first_name, last_name, email, mobile_number

7. **Performance Considerations**:
   - Limit max 100 per page
   - Indexed foreign keys for fast joins
   - Efficient role-based filtering in SQL

8. **Security**:
   - All endpoints require authentication
   - Role middleware enforces permissions
   - Partners cannot access other partners' data
   - Validation prevents injection attacks

---

**Last Updated:** 2024
**API Version:** v1
**Status:** Backend Complete ✅
