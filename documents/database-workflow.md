# SEIF Portal - Database Workflow Guide

**Purpose**: This document explains only the most important tables and how data flows through the system in simple steps.

**Last Updated**: November 5, 2025

---

## Important Tables Overview

### Core Tables (Must Know)

1. **users** - Who can log into the system
2. **partners** - Training organizations
3. **centers** - Training locations (approved)
4. **batches** - Training groups (approved)
5. **data_uploads** - Upload tracking
6. **uploaded_centers** - Centers waiting for approval
7. **uploaded_batches** - Batches waiting for approval
8. **uploaded_students** - Students waiting for approval
9. **requests** - All types of requests
10. **refurbishment_requests** - Equipment replacement details
11. **notifications** - Alerts and messages

---

## Table 1: users

**What it stores**: Login accounts for admins, partners, and SEIF team

**Important Fields**:

- `email` - Login email
- `password_hash` - Encrypted password
- `role` - What they can do (ADMIN, PARTNER, SEIF_READONLY, etc.)
- `partner_id` - Links to partner (NULL for admins)

**Example**:

```
Email: admin@seif.org.in
Role: ADMIN
Partner: NULL (admin user)
```

```
Email: contact@techpartner.com
Role: PARTNER
Partner: Links to "Tech Skills Training"
```

---

## Table 2: partners

**What it stores**: Partner organizations that run training centers

**Important Fields**:

- `name` - Organization name
- `contact_person` - Main contact
- `contact_email` - Email
- `status` - active/inactive

**Example**:

```
Name: Tech Skills Training Pvt Ltd
Contact Person: Amit Verma
Email: amit.verma@techskills.com
Status: active
```

---

## Table 3: centers (Approved Data)

**What it stores**: Approved training centers

**Important Fields**:

- `partner_id` - Which partner owns this
- `center_name` - Name of center
- `city`, `state` - Location
- `refurbishment_eligible` - Can request equipment?
- `last_refurbishment_date` - When last refurbished

**Example**:

```
Partner: Tech Skills Training
Center Name: Pune Center 1
City: Pune
State: Maharashtra
Refurbishment Eligible: true
Last Refurbishment: 2023-06-15
```

---

## Table 4: data_uploads (Upload Tracking)

**What it stores**: Every CSV upload by partners

**Important Fields**:

- `partner_id` - Who uploaded
- `file_url` - Where CSV is stored (S3)
- `status` - pending/approved/rejected
- `total_records` - How many rows
- `uploaded_by` - Which user
- `reviewed_by` - Which admin reviewed
- `rejection_reason` - Why rejected (if rejected)

**Example**:

```
Partner: Tech Skills Training
File: pune_center_data.csv
Status: pending
Total Records: 50
Uploaded By: partner@techskills.com
Reviewed By: NULL (not reviewed yet)
```

---

## Table 5: uploaded_centers (Staging)

**What it stores**: Center data from CSV waiting for admin approval

**Important Fields**:

- `data_upload_id` - Which upload this belongs to
- `csv_center_id` - Partner-provided center identifier from CSV (used to group rows for multiple centers in one file)
- `center_name` - Center name from CSV
- `approval_status` - pending/approved/rejected
- `approved_center_id` - Links to centers table (after approval)
- `rejection_reason` - Why rejected

**Example**:

```
Data Upload: pune_center_data.csv
Center Name: Pune Center 1
Approval Status: pending
Approved Center ID: NULL (not approved yet)
```

---

## Table 6: requests (All Requests)

**What it stores**: All types of requests between partners and admins

**Important Fields**:

- `request_number` - REQ-2024-00123
- `type` - upload_request/refurbishment/support
- `partner_id` - Which partner
- `center_id` - Which center (if applicable)
- `status` - pending/partner_submitted/in_review/approved/rejected
- `created_by` - Who created request

**Example**:

```
Request Number: REQ-2024-00123
Type: refurbishment
Partner: Tech Skills Training
Center: Pune Center 1
Status: pending
Created By: admin@seif.org.in (admin created)
```

---

## Table 7: refurbishment_requests

**What it stores**: Details about equipment replacement requests

**Important Fields**:

- `request_id` - Links to requests table
- `center_id` - Which center needs refurbishment
- `refurbishment_type` - refurbishment/upgradation/both

**Example**:

```
Request: REQ-2024-00123
Center: Pune Center 1
Type: refurbishment
```

---

## Table 8: notifications

**What it stores**: In-app alerts and messages

**Important Fields**:

- `recipient_id` - Who should see this (specific user)
- `recipient_role` - Or broadcast to all ADMINs/PARTNERs
- `type` - request/approval/rejection/alert
- `title` - Notification title
- `message` - Notification text
- `is_read` - Have they seen it?

**Example**:

```
Recipient: partner@techskills.com
Type: approval
Title: Upload Approved
Message: Your upload has been approved
Is Read: false
```

---

## Workflow 1: Partner Uploads Center Data

**Simple Steps**:

```
Step 1: Partner Login
   → Partner user logs in with email and password

Step 2: Partner Prepares CSV File
   → CSV contains: Center details + Batch details + Student records
   → CSV includes two important columns: `center_name` and `center_id` (a partner-provided identifier)
   → A single CSV file may contain multiple centers. The system groups rows by the provided `center_id` (csv_center_id) to create separate staging entries for each center found in the file

Step 3: Partner Uploads File
   → Goes to "Upload Data" page
   → Fills form and attaches CSV
   → Clicks "Upload"

Step 4: File Stored in S3
   → CSV uploaded to cloud storage (AWS S3)
   → Unique URL generated

Step 5: Create Upload Record
   → New row in data_uploads table
   → Status: pending
   → File URL saved

Step 6: Parse CSV in Background
   → System reads CSV line by line
   → For each row, determine `csv_center_id` (from `center_id` column) and group rows by this identifier
   → For each distinct `csv_center_id` found:
      • ALWAYS create one `uploaded_centers` row for this upload (data_upload_id, partner_id, csv_center_id, center_name, etc.). Do NOT auto-link this staging row to an existing `centers` record even if the `csv_center_id` value looks identical to an existing center — admin must review and decide whether to link or create a new approved center.
      • Create `uploaded_batches` rows linked to that `uploaded_center` (set `csv_center_id` on batch rows)
      • Create `uploaded_students` rows linked to the correct uploaded_batch and uploaded_center (set `csv_center_id` on student rows)
   → All staging rows are created with `approval_status = pending`

Step 7: Notify Admin
   → New row in notifications table
   → Recipient Role: ADMIN
   → Message: "New upload pending review"

Step 8: Partner Sees Confirmation
   → UI shows: "Upload successful! Pending admin review."
```

---

## Workflow 2: Admin Reviews Upload

**Simple Steps**:

```
Step 1: Admin Sees Notification
   → Admin logs in
   → Sees: "New Upload Pending Review"
   → Clicks notification

Step 2: Admin Views Data
   → Sees center details
   → Sees batch details
   → Sees all students (table with pagination)

Step 3: Admin Checks Data Quality
   → Center name correct?
   → Batch dates valid?
   → Student IDs in correct format?
   → All required fields filled?

Step 4A: Admin Approves (If data is good)
   → Clicks "Approve" button
   → System copies data:
      - uploaded_centers → centers (new center created)
      - uploaded_batches → batches (new batch created)
      - uploaded_students → future students table
   → Update data_uploads.status = approved
   → Update approval_status = approved in all staging tables
   → Create notification to partner: "Upload Approved"

Step 4B: Admin Rejects (If data has issues)
   → Clicks "Reject" button
   → Fills rejection form:
      - Reason: "Invalid student IDs"
      - Remarks: "Row 15 has wrong format. Use STUD-YYYY-NNNN"
   → Update data_uploads.status = rejected
   → Update approval_status = rejected in all staging tables
   → Create notification to partner with detailed reason

Step 5: Partner Sees Result
   → If Approved: "Your upload is now in the main database"
   → If Rejected: "Upload rejected. Reason: [details]. Please fix and re-upload"

Step 6: Partner Re-uploads (If rejected)
   → Partner fixes CSV based on remarks
   → Partner uploads corrected file
   → Process repeats from Step 1
```

---

## Workflow 3: Scheduled Upload Request

**Simple Steps**:

```
Step 1: Admin Creates Scheduled Request
   → Admin goes to "Request Upload" page
   → Selects:
      - Partner: Tech Skills Training
      - Center: Pune Center 1 (optional)
      - Reason: "Monthly data update required"
      - Schedule: Monthly
      - Start Date: 2024-11-01
      - End Date: 2025-10-31
   → Clicks "Create Request"

Step 2: System Creates Records
   → New row in requests table:
      - request_number: REQ-2024-00456
      - type: upload_request
      - status: pending
   → New row in scheduled_requests table:
      - recurrence_type: monthly
      - next_scheduled_date: 2024-11-01

Step 3: Create Notification
   → New row in notifications table
   → Recipient: partner user
   → Message: "Please upload data for Pune Center 1"

Step 4: Daily Background Job (Runs at 9 AM)
   → Job checks: Are there any scheduled requests due today?
   → If yes:
      - Send notification to partner (reminder)
      - Calculate next date:
        • If monthly: next_scheduled_date + 1 month
        • If quarterly: next_scheduled_date + 3 months
      - Update next_scheduled_date

Step 5: Check If Schedule Complete
   → If next_scheduled_date > end_date:
      - Mark scheduled_request as inactive
      - No more notifications sent

Step 6: Partner Sees Request
   → Partner logs in
   → Sees notification: "Upload Request"
   → Partner uploads data (follows Upload Workflow)
```

---

## Workflow 4: Refurbishment Request

**Simple Steps**:

```
Step 1: System Checks Eligibility (Daily at Midnight)
   → Background job runs
   → For each center, calculates:
      - months_since_last = Current Date - Last Refurbishment Date
      - If months_since >= refurbishment_frequency:
        • Update centers.refurbishment_eligible = true
        • Send notification to admins

Step 2: Admin Sees Eligible Center
   → Admin logs in
   → Sees notification: "Pune Center 1 eligible for refurbishment"
   → Admin goes to Refurbishment page

Step 3: Admin Creates Request
   → Admin clicks "Create Refurbishment Request"
   → Selects:
      - Center: Pune Center 1
      - Courses: Electrical, Solar (center offers these)
      - For Electrical course: Selects packages (Multimeter, Oscilloscope)
      - For Solar course: Selects packages (Solar Panels, Inverter)
      - Remarks: "Please review and select what you need"
   → Clicks "Create"

Step 4: System Creates Records
   → New row in requests table:
      - request_number: REQ-2024-00789
      - type: refurbishment
      - status: pending
   → New row in refurbishment_requests table
   → Multiple rows in refurbishment_admin_selected_packages:
      - One for each package per course
   → Notification sent to partner

Step 5: Partner Sees Alert
   → Partner logs in
   → Inbox → Alerts tab
   → Sees: "Refurbishment Request Created"
   → Clicks "View"

Step 6: Partner Reviews Request
   → Sees admin-selected packages grouped by course
   → Electrical tab: Shows Multimeter, Oscilloscope
   → Solar tab: Shows Solar Panels, Inverter

Step 7: Partner Selects Packages
   → Electrical tab:
      - Checks: ☑ Multimeter (needs it)
      - Unchecks: ☐ Oscilloscope (doesn't need)
      - Writes justification: "Current multimeters 8 years old"
      - Uploads photos: multimeter_old.jpg
   → Solar tab:
      - Checks: ☑ Solar Panels, ☑ Inverter
      - Writes justification: "Low efficiency, frequent failures"
      - Uploads photos: solar_panels_damaged.jpg, inverter_faulty.jpg

Step 8: Partner Optionally Requests Room Upgradation
   → Checks: ☑ Request Room Upgradation
   → Fills:
      - Room Name: Electrical Lab
      - Length: 12.5 meters
      - Breadth: 8.0 meters
      - Height: 3.5 meters
      - Justification: "Room too small for 50 students"
      - Uploads: room_crowded.jpg

Step 9: Partner Submits
   → Clicks "Preview" to review everything
   → Clicks "Submit"
   → System saves:
      - Updates requests.status = partner_submitted
      - Creates rows in refurbishment_request_course_packages (partner selections)
      - Creates rows in refurbishment_request_course_attachments (photos per course)
      - Creates row in refurbishment_upgradation_rooms (if room upgradation)
      - Creates rows in refurbishment_upgradation_photos (room photos)
   → Notification sent to admin

Step 10: Admin Reviews Submission
   → Admin logs in
   → Sees: "Partner Submitted Refurbishment Request"
   → Admin goes to request
   → Views:
      - Electrical tab: Partner selected Multimeter, uploaded photos
      - Solar tab: Partner selected both packages, uploaded photos
      - Upgradation tab: Room details with dimensions, photos

Step 11: Admin Approves or Rejects
   → If Approves:
      - Clicks "Approve"
      - Writes remarks: "Approved. Equipment will be delivered in 3 weeks"
      - Updates:
        • requests.status = approved
        • centers.last_refurbishment_date = today
        • centers.refurbishment_eligible = false
      - Notification to partner: "Refurbishment Approved"

   → If Rejects:
      - Clicks "Reject"
      - Writes reason: "Need more justification for Solar items"
      - Updates requests.status = rejected
      - Notification to partner with reason

Step 12: Partner Sees Result
   → If Approved: "Request approved! Equipment coming soon."
   → If Rejected: "Request rejected. Reason: [details]. Please revise."

Step 13: Partner Re-submits (If rejected)
   → Partner goes back to request
   → Form pre-filled with previous selections
   → Partner updates justification
   → Partner re-submits
   → Process repeats from Step 10
```

---

## Key Database Rules

### Rule 1: Upload Approval

- **All or Nothing**: Admin must approve or reject entire upload
- Cannot approve individual students - must approve all together
- If one row is wrong, entire upload rejected
- Partner fixes CSV and re-uploads everything

### Rule X: Bulk CSV Center Grouping

- **CSV must contain `center_id` and `center_name` columns**. The importer groups rows by `center_id` (csv_center_id) to create one `uploaded_centers` per distinct center in the file.
- Matching is case-insensitive and trimmed. If two rows have the same `center_id`, they will map to the same staging center even if names vary slightly; admins can edit the staging center before approval.
  -- If partner provides a `center_id` that matches an existing approved center `id`, the importer must STILL create a staging `uploaded_centers` row. Do NOT auto-link staging rows to the `centers` table. Admin must review staging rows and decide whether to link to an existing `centers` record or create a new one during approval.

### Rule Y: ESSCI Password Reset Policy

- ESSCI role users cannot perform self-service password resets. The system must NOT create `password_resets` tokens for users with role = 'ESSCI'.
- ESSCI users should use the "Request Admin Reset" flow. A `password_reset_requests` record is created (status = pending). Admin reviews the request and either processes it (generates a `password_resets` token or sets a new password) or declines.
- All admin actions in this flow must be recorded in `audit_logs`.

### Rule 2: Refurbishment Eligibility

- **Formula**: months_since_last >= refurbishment_frequency_months
- Background job runs daily at midnight
- Auto-updates centers.refurbishment_eligible flag
- Admin gets notification for eligible centers

### Rule 3: Request Status Flow

- **Allowed Transitions**:
  - pending → partner_submitted → in_review → approved ✅
  - pending → partner_submitted → in_review → rejected ✅
  - rejected → partner_submitted (re-submission) ✅
- **Not Allowed**:
  - approved → any other status ❌ (final state)
  - Cannot skip steps ❌

### Rule 4: Notifications

- **In-app only** - No emails or SMS
- Two types:
  - Individual: Sent to specific user
  - Broadcast: Sent to all users with a role (all ADMINs)
- Never deleted - only marked as read

### Rule 5: File Storage

- All files stored in AWS S3
- Database stores only URLs, not actual files
- Example: `s3://seif-uploads/partner-123/upload-456.csv`

---

## Table Connections

### Connection 1: User → Partner → Center → Batch

```
users (login)
   ↓
partners (organization)
   ↓
centers (training location)
   ↓
batches (training groups)
```

**Example**:

- User: partner@techskills.com
- Partner: Tech Skills Training
- Center: Pune Center 1, Pune Center 2
- Batches: Batch-2024-001, Batch-2024-002

### Connection 2: Upload Flow (Staging → Approved)

```
data_uploads (upload tracking)
   ↓
uploaded_centers (staging)
   ↓
uploaded_batches (staging)
   ↓
uploaded_students (staging)

      ↓↓↓ ADMIN APPROVAL ↓↓↓

centers (approved)
   ↓
batches (approved)
```

### Connection 3: Request System

```
requests (master request)
   ↓
refurbishment_requests (if type=refurbishment)
   ↓
refurbishment_request_course_packages (partner selections per course)
   ↓
refurbishment_request_course_attachments (photos per course)
```

---

## Quick Reference

### When Partner Uploads:

1. File goes to S3
2. Data goes to: data_uploads, uploaded_centers, uploaded_batches, uploaded_students
3. Admin gets notification
4. Status: pending

### When Admin Approves:

1. Data copies to: centers, batches
2. Status changes to: approved
3. Partner gets notification

### When Admin Rejects:

1. Status changes to: rejected
2. Rejection reason saved
3. Partner gets notification with reason
4. Partner can fix and re-upload

### When Refurbishment Created:

1. Admin creates request with pre-selected packages per course
2. Partner selects what they need per course
3. Partner uploads photos per course
4. Partner optionally requests room upgradation
5. Admin reviews and approves/rejects

---

**End of Document**

This guide covers the most important tables and workflows in simple language. For complete technical details, refer to DATABASE_DOCUMENTATION.md.
