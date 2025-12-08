# SEIF Portal - Database Documentation

## Document Overview

**Purpose**: This document explains the SEIF Portal database in simple, easy-to-understand language. It includes detailed information about all tables, how they connect to each other, and how data flows through the system.

**Who should read this**:

- Non-technical stakeholders and clients who want to understand how data is organized
- New developers joining the project who need to understand the database structure
- Anyone who wants to see how the portal manages partners, centers, uploads, and refurbishments

**Last Updated**: November 5, 2025

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Table Categories](#table-categories)
3. [Detailed Table Descriptions](#detailed-table-descriptions)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Process Flowcharts](#process-flowcharts)
6. [Table Relationships](#table-relationships)
7. [Important Business Rules](#important-business-rules)
8. [Sample Data Examples](#sample-data-examples)

---

## Database Overview

### What does this database do?

The SEIF Portal database stores and manages all information related to:

- **Training partners** and their **training centers** across India
- **Student data** from partner uploads (with approval workflow)
- **Refurbishment requests** for centers that need equipment or facility upgrades
- **User accounts** and their permissions (Admins, Partners, SEIF team)
- **Notifications** to keep everyone informed
- **Audit trails** to track who did what and when

### Key Concepts

**Staging vs Approved Data**: When partners upload center and student data, it first goes into "staging tables" (uploaded_centers, uploaded_batches, uploaded_students). Admins review this data and either approve or reject it. Only approved data moves to the main tables (centers, batches).

**Request System**: Partners can raise different types of requests (refurbishment, data corrections, support). Each request goes through a workflow: pending → partner_submitted → in_review → approved/rejected.

**Refurbishment Flow**: Centers become eligible for refurbishment based on time since last refurbishment. Admin creates a request, partner selects needed packages course-by-course with photos, and admin reviews and approves.

---

## Table Categories

The database has **27 tables** organized into these categories:

### 1. Authentication & Users (2 tables)

- `users` - User accounts with roles and permissions
- `password_resets` - Password reset tokens

### 2. Partners (1 table)

- `partners` - Partner organizations that manage training centers

### 3. Lookup Tables (2 tables)

- `courses` - List of available courses (Electrical, Solar, etc.)
- `course_packages` - Links courses to refurbishment packages

### 4. Centers & Batches - Approved Data (3 tables)

- `centers` - Approved training centers
- `center_courses` - Links centers to the courses they offer
- `batches` - Approved training batches

### 5. Data Uploads - Staging Area (4 tables)

- `data_uploads` - Upload metadata and status
- `uploaded_centers` - Centers pending approval
- `uploaded_batches` - Batches pending approval
- `uploaded_students` - Students pending approval

### 6. Requests (3 tables)

- `requests` - All types of requests (generic table)
- `scheduled_requests` - Recurring admin upload requests
- `refurbishment_requests` - Refurbishment-specific details

### 7. Refurbishment System (7 tables)

- `refurbishment_packages` - Available refurbishment items
- `refurbishment_request_packages` - (Legacy table)
- `refurbishment_admin_selected_packages` - Admin's pre-selected packages per course
- `refurbishment_request_course_packages` - Partner's final selections per course
- `refurbishment_request_course_attachments` - Photos per course
- `refurbishment_upgradation_rooms` - Room dimensions for upgrades
- `refurbishment_upgradation_photos` - Room photos

### 8. Request Support (2 tables)

- `request_attachments` - Files attached to requests
- `request_comments` - Comments and discussions on requests

### 9. Notifications (1 table)

- `notifications` - In-app notifications and alerts

### 10. Reporting & Audit (2 tables)

- `download_logs` - Track report downloads by SEIF users
- `audit_logs` - Complete activity trail

---

## Detailed Table Descriptions

Below you'll find complete information about each table including purpose, all fields with descriptions, and sample data.

---

### Category 1: Authentication & Users

---

#### Table: `users`

**Purpose**: Stores all user accounts for the portal. Each user has a role (Admin, Partner, SEIF team member) that determines what they can do.

**Key Fields**:

| Field Name      | Type         | Description                                                | Example                                                     |
| --------------- | ------------ | ---------------------------------------------------------- | ----------------------------------------------------------- |
| `id`            | UUID         | Unique identifier for each user                            | `a3b5c7d9-1234-5678-90ab-cdef12345678`                      |
| `email`         | VARCHAR(255) | User's login email (unique)                                | `john.partner@example.com`                                  |
| `password_hash` | VARCHAR(255) | Encrypted password (never stored as plain text)            | `$2b$10$abcdef...`                                          |
| `full_name`     | VARCHAR(255) | User's full name                                           | `John Sharma`                                               |
| `mobile_number` | VARCHAR(20)  | Contact phone number                                       | `+91-9876543210`                                            |
| `role`          | VARCHAR(50)  | User's permission level                                    | `PARTNER`, `ADMIN`, `SEIF_READONLY`, `SUPER_ADMIN`, `ESSCI` |
| `partner_id`    | UUID         | Links to partner organization (NULL for non-partner users) | Links to `partners.id`                                      |
| `status`        | VARCHAR(20)  | Account status                                             | `active`, `inactive`, `suspended`                           |
| `last_login_at` | TIMESTAMP    | When user last logged in                                   | `2025-11-05 10:30:00`                                       |
| `created_at`    | TIMESTAMP    | When account was created                                   | `2025-01-15 14:20:00`                                       |
| `updated_at`    | TIMESTAMP    | Last time account was modified                             | `2025-11-05 10:30:00`                                       |

**Indexes**: email, role, partner_id

**Relationships**:

- Links to `partners.id` (if user is a partner employee)
- Referenced by `data_uploads.uploaded_by`, `requests.created_by`, and many other tables

**Sample Data**:

```
ID: a3b5c7d9-1234-5678-90ab-cdef12345678
Email: admin@seif.org.in
Full Name: Rajesh Kumar
Role: ADMIN
Status: active
Partner ID: NULL (not a partner user)
Last Login: 2025-11-05 10:30:00
```

```
ID: b4c6d8e0-2345-6789-01bc-def123456789
Email: contact@techpartner.com
Full Name: Priya Sharma
Role: PARTNER
Status: active
Partner ID: e7f9g1h3-5678-9012-34ef-567890123456
Last Login: 2025-11-04 16:45:00
```

---

#### Table: `password_resets`

**Purpose**: Manages password reset tokens when users forget their passwords. Each token is unique and expires after a certain time.

**Key Fields**:

| Field Name   | Type         | Description                                   | Example                                              |
| ------------ | ------------ | --------------------------------------------- | ---------------------------------------------------- |
| `id`         | UUID         | Unique identifier                             | `c5d7e9f1-3456-7890-12cd-ef1234567890`               |
| `user_id`    | UUID         | Which user requested the reset                | Links to `users.id`                                  |
| `token`      | VARCHAR(255) | Unique reset token (sent via email in future) | `abc123def456ghi789jkl012mno345pqr678`               |
| `expires_at` | TIMESTAMP    | When this token becomes invalid               | `2025-11-05 14:30:00` (usually 1 hour from creation) |
| `used_at`    | TIMESTAMP    | When token was used (NULL if not used yet)    | `2025-11-05 13:15:00` or NULL                        |
| `created_at` | TIMESTAMP    | When reset was requested                      | `2025-11-05 12:30:00`                                |

**Relationships**:

- Links to `users.id`

**Sample Data**:

```
ID: c5d7e9f1-3456-7890-12cd-ef1234567890
User ID: b4c6d8e0-2345-6789-01bc-def123456789
Token: abc123def456ghi789jkl012mno345pqr678
Expires At: 2025-11-05 14:30:00
Used At: NULL (not used yet)
Created At: 2025-11-05 12:30:00
```

---

#### Table: `password_reset_requests`

**Purpose**: Records requests for admins to reset passwords. This is used primarily for `ESSCI` role users who are not allowed to self-generate password reset tokens.

**Key Fields**:

| Field Name       | Type        | Description                                                | Example                                |
| ---------------- | ----------- | ---------------------------------------------------------- | -------------------------------------- |
| `id`             | UUID        | Unique identifier                                          | `u1v2w3x4-5678-9012-34ab-567890abcdef` |
| `user_id`        | UUID        | Which user needs a reset                                   | Links to `users.id`                    |
| `requested_by`   | UUID        | Who initiated request (could be same user or another user) | Links to `users.id`                    |
| `request_reason` | TEXT        | Reason given by requester                                  | `Forgot password, please reset`        |
| `status`         | VARCHAR(50) | Request status (`pending`, `processed`, `declined`)        | `pending`                              |
| `processed_by`   | UUID        | Admin who processed request                                | Links to `users.id`                    |
| `processed_at`   | TIMESTAMP   | When admin processed it                                    | `2025-11-05 15:00:00`                  |
| `admin_notes`    | TEXT        | Admin remarks                                              | `Reset and emailed new temp password`  |
| `created_at`     | TIMESTAMP   | When request was created                                   | `2025-11-05 14:40:00`                  |

**Relationships & Notes**:
**Relationships & Notes**:

- Use `password_reset_requests` to store requests from `ESSCI` users. The application must prevent creating `password_resets` tokens for users with role = `ESSCI` (no self-service tokens).
- ESSCI users should request an admin reset. Admins may reset the password directly (for example, set a temporary password or update `password_hash`). When an admin processes a reset the system should:
  - update the user's `password_hash`,
  - set `processed_by` and `processed_at` on the `password_reset_requests` row and mark `status = 'processed'`,
  - record the admin action in `audit_logs` (who, when, what changed), and
  - optionally notify the user (in-app notification) that an admin reset occurred.

**Sample Data**:

```
ID: u1v2w3x4-5678-9012-34ab-567890abcdef
User ID: z9y8x7w6-3456-7890-abcd-1234567890ab
Requested By: z9y8x7w6-3456-7890-abcd-1234567890ab
Request Reason: "Forgot password"
Status: pending
Processed By: NULL
Processed At: NULL
Admin Notes: NULL
Created At: 2025-11-05 14:40:00
```

### Category 2: Partners

---

#### Table: `partners`

**Purpose**: Stores information about partner organizations that run training centers. Each partner can manage multiple centers.

**Key Fields**:

| Field Name          | Type         | Description                   | Example                                                 |
| ------------------- | ------------ | ----------------------------- | ------------------------------------------------------- |
| `id`                | UUID         | Unique identifier for partner | `e7f9g1h3-5678-9012-34ef-567890123456`                  |
| `name`              | VARCHAR(255) | Partner organization name     | `Tech Skills Training Pvt Ltd`                          |
| `organization_type` | VARCHAR(100) | Type of organization          | `NGO`, `Private`, `Government`, `Educational Institute` |
| `contact_person`    | VARCHAR(255) | Main contact person name      | `Amit Verma`                                            |
| `contact_email`     | VARCHAR(255) | Contact email                 | `amit.verma@techskills.com`                             |
| `contact_phone`     | VARCHAR(20)  | Contact phone                 | `+91-9876543210`                                        |
| `address_line1`     | VARCHAR(255) | Street address                | `123, Industrial Area, Phase 2`                         |
| `address_line2`     | VARCHAR(255) | Additional address info       | `Near Railway Station`                                  |
| `city`              | VARCHAR(100) | City                          | `Pune`                                                  |
| `state`             | VARCHAR(100) | State                         | `Maharashtra`                                           |
| `country`           | VARCHAR(100) | Country (default: India)      | `India`                                                 |
| `postal_code`       | VARCHAR(20)  | PIN code                      | `411001`                                                |
| `status`            | VARCHAR(20)  | Partner status                | `active`, `inactive`, `suspended`                       |
| `registration_date` | DATE         | When partner was registered   | `2024-03-15`                                            |
| `created_at`        | TIMESTAMP    | Record creation time          | `2024-03-15 10:00:00`                                   |
| `updated_at`        | TIMESTAMP    | Last update time              | `2025-11-01 15:30:00`                                   |

**Indexes**: name, status

**Relationships**:

- Referenced by `users` (partner employees)
- Referenced by `centers` (partner's training centers)
- Referenced by `data_uploads`, `batches`, `requests`

**Sample Data**:

```
ID: e7f9g1h3-5678-9012-34ef-567890123456
Name: Tech Skills Training Pvt Ltd
Organization Type: Private
Contact Person: Amit Verma
Contact Email: amit.verma@techskills.com
Contact Phone: +91-9876543210
Address: 123, Industrial Area, Phase 2, Near Railway Station
City: Pune
State: Maharashtra
Country: India
Postal Code: 411001
Status: active
Registration Date: 2024-03-15
```

---

### Category 3: Lookup Tables

---

#### Table: `courses`

**Purpose**: Master list of all training courses offered (Electrical, Solar, Industrial Automation, etc.). Centers can offer multiple courses from this list.

**Key Fields**:

| Field Name        | Type         | Description                  | Example                                                                  |
| ----------------- | ------------ | ---------------------------- | ------------------------------------------------------------------------ |
| `id`              | UUID         | Unique identifier            | `f8g0h2i4-6789-0123-45fg-678901234567`                                   |
| `course_name`     | VARCHAR(255) | Full course name (unique)    | `Electrical & Electronics`                                               |
| `course_code`     | VARCHAR(50)  | Short code (unique)          | `ELE-101`                                                                |
| `description`     | TEXT         | Course details               | `Basic and advanced electrical wiring, electronics circuits, and safety` |
| `duration_months` | INT          | Course duration              | `6` (months)                                                             |
| `is_active`       | BOOLEAN      | Is course currently offered? | `true` or `false`                                                        |
| `created_at`      | TIMESTAMP    | When added                   | `2024-01-10 09:00:00`                                                    |
| `updated_at`      | TIMESTAMP    | Last modified                | `2025-01-15 11:00:00`                                                    |

**Indexes**: course_name, course_code

**Relationships**:

- Referenced by `center_courses` (which centers offer which courses)
- Referenced by `course_packages` (which refurbishment packages are for which courses)
- Referenced by refurbishment course selection tables

**Sample Data**:

```
ID: f8g0h2i4-6789-0123-45fg-678901234567
Course Name: Electrical & Electronics
Course Code: ELE-101
Description: Basic and advanced electrical wiring, electronics circuits, and safety
Duration: 6 months
Is Active: true
```

```
ID: g9h1i3j5-7890-1234-56gh-789012345678
Course Name: Solar Technology
Course Code: SOL-102
Description: Solar panel installation, maintenance, and grid integration
Duration: 3 months
Is Active: true
```

```
ID: h0i2j4k6-8901-2345-67hi-890123456789
Course Name: Industrial Automation
Course Code: IA-103
Description: PLC programming, robotics, and industrial control systems
Duration: 9 months
Is Active: true
```

---

#### Table: `course_packages`

**Purpose**: Links courses to refurbishment packages. This defines which equipment/furniture packages are relevant for which courses. For example, "Electrical Lab Equipment Package" is linked to "Electrical & Electronics" course.

**Key Fields**:

| Field Name   | Type      | Description                 | Example                                |
| ------------ | --------- | --------------------------- | -------------------------------------- |
| `id`         | UUID      | Unique identifier           | `i1j3k5l7-9012-3456-78ij-901234567890` |
| `course_id`  | UUID      | Which course                | Links to `courses.id`                  |
| `package_id` | UUID      | Which refurbishment package | Links to `refurbishment_packages.id`   |
| `created_at` | TIMESTAMP | When link was created       | `2024-06-01 10:00:00`                  |

**Unique Constraint**: (course_id, package_id) - one package can only be linked to a course once

**Indexes**: course_id, package_id

**Relationships**:

- Links `courses` to `refurbishment_packages` (many-to-many relationship)

**Sample Data**:

```
ID: i1j3k5l7-9012-3456-78ij-901234567890
Course ID: f8g0h2i4-6789-0123-45fg-678901234567 (Electrical & Electronics)
Package ID: j2k4l6m8-0123-4567-89jk-012345678901 (Electrical Lab Equipment)
Created At: 2024-06-01 10:00:00
```

```
ID: j2k4l6m8-0123-4567-89jk-012345678902
Course ID: g9h1i3j5-7890-1234-56gh-789012345678 (Solar Technology)
Package ID: k3l5m7n9-1234-5678-90kl-123456789012 (Solar Panel Installation Kit)
Created At: 2024-06-01 10:15:00
```

---

### Category 4: Centers & Batches (Approved Data)

---

#### Table: `centers`

**Purpose**: Stores approved training centers. These are the physical locations where training happens. Each center is managed by a partner and can offer multiple courses.

**Key Fields**:

| Field Name                       | Type          | Description                        | Example                                                        |
| -------------------------------- | ------------- | ---------------------------------- | -------------------------------------------------------------- |
| `id`                             | UUID          | Unique identifier                  | `l4m6n8o0-2345-6789-01lm-234567890123`                         |
| `partner_id`                     | UUID          | Which partner manages this center  | Links to `partners.id`                                         |
| `center_name`                    | VARCHAR(255)  | Center name                        | `Tech Skills Pune Center 1`                                    |
| `center_type`                    | VARCHAR(100)  | Type of training                   | `Short Term`, `Long Term`, `ITI`, `Polytechnic`                |
| `region`                         | VARCHAR(100)  | Geographic region                  | `North`, `South`, `East`, `West`, `Central`                    |
| `city`                           | VARCHAR(100)  | City name                          | `Pune`                                                         |
| `state`                          | VARCHAR(100)  | State name                         | `Maharashtra`                                                  |
| `address`                        | TEXT          | Full address                       | `Plot 45, Sector 12, MIDC Area, Pune`                          |
| `year_of_establishment`          | INT           | When center was established        | `2020`                                                         |
| `status`                         | VARCHAR(50)   | Center status                      | `active`, `inactive`, `under_maintenance`                      |
| `center_head`                    | VARCHAR(255)  | Person in charge                   | `Suresh Patil`                                                 |
| `mobile_number`                  | VARCHAR(20)   | Contact number                     | `+91-9123456789`                                               |
| `email`                          | VARCHAR(255)  | Center email                       | `pune.center1@techskills.com`                                  |
| `latitude`                       | DECIMAL(10,8) | GPS latitude                       | `18.5204303`                                                   |
| `longitude`                      | DECIMAL(11,8) | GPS longitude                      | `73.8567437`                                                   |
| `refurbishment_eligible`         | BOOLEAN       | Is eligible for refurbishment now? | `true` or `false`                                              |
| `refurbishment_frequency_months` | INT           | How often refurbishment is needed  | `0` (immediate), `6` (6 months), `12` (1 year), `24` (2 years) |
| `last_refurbishment_date`        | DATE          | When last refurbished              | `2023-06-15`                                                   |
| `created_at`                     | TIMESTAMP     | Record creation                    | `2024-02-10 09:00:00`                                          |
| `updated_at`                     | TIMESTAMP     | Last update                        | `2025-11-01 14:30:00`                                          |

**Business Rule**: Center becomes eligible for refurbishment when:

- `(CURRENT_DATE - last_refurbishment_date) >= refurbishment_frequency_months`
- OR for new centers: `(CURRENT_DATE - year_of_establishment) >= refurbishment_frequency_months`

**Indexes**: partner_id, center_type, region, state, status

**Relationships**:

- Links to `partners.id`
- Referenced by `batches`, `center_courses`, `requests`, `refurbishment_requests`
- Referenced by upload staging tables

**Sample Data**:

```
ID: l4m6n8o0-2345-6789-01lm-234567890123
Partner ID: e7f9g1h3-5678-9012-34ef-567890123456
Center Name: Tech Skills Pune Center 1
Center Type: Short Term
Region: West
City: Pune
State: Maharashtra
Address: Plot 45, Sector 12, MIDC Area, Pune
Year of Establishment: 2020
Status: active
Center Head: Suresh Patil
Mobile: +91-9123456789
Email: pune.center1@techskills.com
Latitude: 18.5204303
Longitude: 73.8567437
Refurbishment Eligible: true
Refurbishment Frequency: 12 months
Last Refurbishment Date: 2023-06-15
```

---

#### Table: `center_courses`

**Purpose**: Links centers to the courses they offer. A center can offer multiple courses (Electrical, Solar, etc.), and a course can be offered at multiple centers.

**Key Fields**:

| Field Name   | Type      | Description       | Example                                |
| ------------ | --------- | ----------------- | -------------------------------------- |
| `id`         | UUID      | Unique identifier | `m5n7o9p1-3456-7890-12mn-345678901234` |
| `center_id`  | UUID      | Which center      | Links to `centers.id`                  |
| `course_id`  | UUID      | Which course      | Links to `courses.id`                  |
| `created_at` | TIMESTAMP | When added        | `2024-03-01 10:00:00`                  |

**Unique Constraint**: (center_id, course_id) - a center can only offer a specific course once

**Indexes**: center_id, course_id

**Relationships**:

- Links `centers` to `courses` (many-to-many)

**Sample Data**:

```
ID: m5n7o9p1-3456-7890-12mn-345678901234
Center ID: l4m6n8o0-2345-6789-01lm-234567890123 (Tech Skills Pune Center 1)
Course ID: f8g0h2i4-6789-0123-45fg-678901234567 (Electrical & Electronics)
Created At: 2024-03-01 10:00:00
```

```
ID: n6o8p0q2-4567-8901-23no-456789012345
Center ID: l4m6n8o0-2345-6789-01lm-234567890123 (Tech Skills Pune Center 1)
Course ID: g9h1i3j5-7890-1234-56gh-789012345678 (Solar Technology)
Created At: 2024-03-01 10:15:00
```

---

#### Table: `batches`

**Purpose**: Stores approved training batches. A batch is a group of students who started training at the same time in a specific center.

**Key Fields**:

| Field Name            | Type         | Description                      | Example                                |
| --------------------- | ------------ | -------------------------------- | -------------------------------------- |
| `id`                  | UUID         | Unique identifier                | `o7p9q1r3-5678-9012-34op-567890123456` |
| `center_id`           | UUID         | Which center runs this batch     | Links to `centers.id`                  |
| `partner_id`          | UUID         | Which partner manages this batch | Links to `partners.id`                 |
| `batch_number`        | VARCHAR(100) | Batch identifier                 | `BATCH-2024-001`                       |
| `batch_start_date`    | DATE         | When batch started               | `2024-01-15`                           |
| `batch_complete_date` | DATE         | When batch ends/ended            | `2024-07-15`                           |
| `total_students`      | INT          | Total number of students         | `45`                                   |
| `male_students`       | INT          | Number of male students          | `30`                                   |
| `female_students`     | INT          | Number of female students        | `15`                                   |
| `status`              | VARCHAR(50)  | Batch status                     | `active`, `completed`, `cancelled`     |
| `created_at`          | TIMESTAMP    | Record creation                  | `2024-01-10 09:00:00`                  |
| `updated_at`          | TIMESTAMP    | Last update                      | `2024-07-20 10:00:00`                  |

**Indexes**: center_id, partner_id, batch_number, batch_start_date

**Relationships**:

- Links to `centers.id` and `partners.id`

**Sample Data**:

```
ID: o7p9q1r3-5678-9012-34op-567890123456
Center ID: l4m6n8o0-2345-6789-01lm-234567890123
Partner ID: e7f9g1h3-5678-9012-34ef-567890123456
Batch Number: BATCH-2024-001
Batch Start Date: 2024-01-15
Batch Complete Date: 2024-07-15
Total Students: 45
Male Students: 30
Female Students: 15
Status: completed
```

---

### Category 5: Data Uploads (Staging Area)

**Important Concept**: When partners upload center and student data via CSV, the data doesn't go directly into the main tables. Instead, it goes into these "staging" or "pending approval" tables. Admins review the data, and only after approval does it move to the main `centers`, `batches` tables.

---

#### Table: `data_uploads`

**Purpose**: Tracks every CSV upload from partners. This is the master record for each upload with overall status and metadata.

**Key Fields**:

| Field Name         | Type         | Description                | Example                                                         |
| ------------------ | ------------ | -------------------------- | --------------------------------------------------------------- |
| `id`               | UUID         | Unique identifier          | `p8q0r2s4-6789-0123-45pq-678901234567`                          |
| `partner_id`       | UUID         | Which partner uploaded     | Links to `partners.id`                                          |
| `upload_type`      | VARCHAR(50)  | Type of upload             | `center` (currently only center uploads)                        |
| `file_url`         | VARCHAR(500) | S3 URL where CSV is stored | `s3://seif-uploads/partner-123/upload-456.csv`                  |
| `file_name`        | VARCHAR(255) | Original filename          | `pune_center_batch_jan2024.csv`                                 |
| `total_records`    | INT          | Total rows in CSV          | `50` (1 center + 1 batch + 48 students)                         |
| `status`           | VARCHAR(50)  | Upload status              | `pending`, `approved`, `rejected`, `partial`                    |
| `uploaded_by`      | UUID         | Which user uploaded it     | Links to `users.id`                                             |
| `reviewed_by`      | UUID         | Which admin reviewed it    | Links to `users.id`                                             |
| `reviewed_at`      | TIMESTAMP    | When it was reviewed       | `2024-02-15 14:30:00`                                           |
| `rejection_reason` | TEXT         | Why rejected (if rejected) | `Student IDs not in correct format. Use STUD-YYYY-NNNN format.` |
| `remarks`          | TEXT         | Admin's additional notes   | `Please fix row 15 and row 23 and re-upload.`                   |
| `created_at`       | TIMESTAMP    | When uploaded              | `2024-02-10 10:00:00`                                           |
| `updated_at`       | TIMESTAMP    | Last status change         | `2024-02-15 14:30:00`                                           |

**Indexes**: partner_id, upload_type, status, uploaded_by

**Relationships**:

- Links to `partners.id` and `users.id`
- Referenced by `uploaded_centers`, `uploaded_batches`, `uploaded_students`

**Sample Data**:

```
ID: p8q0r2s4-6789-0123-45pq-678901234567
Partner ID: e7f9g1h3-5678-9012-34ef-567890123456
Upload Type: center
File URL: s3://seif-uploads/partner-e7f9/upload-p8q0.csv
File Name: pune_center_batch_jan2024.csv
Total Records: 50
Status: approved
Uploaded By: b4c6d8e0-2345-6789-01bc-def123456789 (partner user)
Reviewed By: a3b5c7d9-1234-5678-90ab-cdef12345678 (admin)
Reviewed At: 2024-02-15 14:30:00
Rejection Reason: NULL
Remarks: Looks good. Approved.
Created At: 2024-02-10 10:00:00
Updated At: 2024-02-15 14:30:00
```

---

#### Table: `uploaded_centers`

**Purpose**: Stores center details from CSV uploads that are waiting for admin approval. One row per center in the CSV.

**Key Fields**:

| Field Name              | Type         | Description                                                                              | Example                                     |
| ----------------------- | ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| `id`                    | UUID         | Unique identifier                                                                        | `q9r1s3t5-7890-1234-56qr-789012345678`      |
| `data_upload_id`        | UUID         | Which upload this belongs to                                                             | Links to `data_uploads.id`                  |
| `partner_id`            | UUID         | Partner ID                                                                               | Links to `partners.id`                      |
| `csv_center_id`         | VARCHAR(100) | Partner-provided center identifier from CSV (used to group multiple centers in one file) | `PUNE-C-001`                                |
| `center_name`           | VARCHAR(255) | Center name from CSV                                                                     | `Tech Skills Pune Center 1`                 |
| `center_type`           | VARCHAR(100) | Type                                                                                     | `Short Term`                                |
| `region`                | VARCHAR(100) | Region                                                                                   | `West`                                      |
| `city`                  | VARCHAR(100) | City                                                                                     | `Pune`                                      |
| `state`                 | VARCHAR(100) | State                                                                                    | `Maharashtra`                               |
| `address`               | TEXT         | Full address                                                                             | `Plot 45, Sector 12, MIDC Area`             |
| `year_of_establishment` | INT          | Year                                                                                     | `2020`                                      |
| `status`                | VARCHAR(50)  | Status                                                                                   | `active`                                    |
| `center_head`           | VARCHAR(255) | Head name                                                                                | `Suresh Patil`                              |
| `mobile_number`         | VARCHAR(20)  | Contact                                                                                  | `+91-9123456789`                            |
| `email`                 | VARCHAR(255) | Email                                                                                    | `pune.center1@techskills.com`               |
| `approval_status`       | VARCHAR(50)  | Approval state                                                                           | `pending`, `approved`, `rejected`           |
| `rejection_reason`      | TEXT         | Why rejected                                                                             | `Address incomplete`                        |
| `remarks`               | TEXT         | Admin notes                                                                              | `Please provide full address with PIN code` |
| `approved_center_id`    | UUID         | Links to approved center (after approval)                                                | Links to `centers.id` (NULL until approved) |
| `created_at`            | TIMESTAMP    | When parsed                                                                              | `2024-02-10 10:15:00`                       |
| `updated_at`            | TIMESTAMP    | Last update                                                                              | `2024-02-15 14:30:00`                       |

**Indexes**: data_upload_id, partner_id, approval_status

**Relationships**:

- Links to `data_uploads.id`, `partners.id`, `centers.id` (after approval)

**Sample Data**:

```
ID: q9r1s3t5-7890-1234-56qr-789012345678
Data Upload ID: p8q0r2s4-6789-0123-45pq-678901234567
Partner ID: e7f9g1h3-5678-9012-34ef-567890123456
Center Name: Tech Skills Pune Center 1
Center Type: Short Term
Region: West
City: Pune
State: Maharashtra
Address: Plot 45, Sector 12, MIDC Area
Year of Establishment: 2020
Approval Status: approved
Approved Center ID: l4m6n8o0-2345-6789-01lm-234567890123
Remarks: Looks good
Created At: 2024-02-10 10:15:00
```

---

#### Table: `uploaded_batches`

**Purpose**: Stores batch details from CSV uploads pending approval. One row per batch in the CSV.

**Key Fields**:

| Field Name            | Type         | Description                                                                                               | Example                                     |
| --------------------- | ------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `id`                  | UUID         | Unique identifier                                                                                         | `r0s2t4u6-8901-2345-67rs-890123456789`      |
| `data_upload_id`      | UUID         | Which upload                                                                                              | Links to `data_uploads.id`                  |
| `csv_center_id`       | VARCHAR(100) | Partner-provided center identifier from CSV (used to link batch rows to a specific uploaded_center entry) | `PUNE-C-001`                                |
| `uploaded_center_id`  | UUID         | Which center in staging                                                                                   | Links to `uploaded_centers.id`              |
| `partner_id`          | UUID         | Partner                                                                                                   | Links to `partners.id`                      |
| `batch_number`        | VARCHAR(100) | Batch ID                                                                                                  | `BATCH-2024-001`                            |
| `batch_start_date`    | DATE         | Start date                                                                                                | `2024-01-15`                                |
| `batch_complete_date` | DATE         | End date                                                                                                  | `2024-07-15`                                |
| `total_students`      | INT          | Total students                                                                                            | `45`                                        |
| `male_students`       | INT          | Male count                                                                                                | `30`                                        |
| `female_students`     | INT          | Female count                                                                                              | `15`                                        |
| `approval_status`     | VARCHAR(50)  | Status                                                                                                    | `pending`, `approved`, `rejected`           |
| `rejection_reason`    | TEXT         | Rejection reason                                                                                          | NULL                                        |
| `remarks`             | TEXT         | Admin notes                                                                                               | NULL                                        |
| `approved_batch_id`   | UUID         | Links to approved batch                                                                                   | Links to `batches.id` (NULL until approved) |
| `created_at`          | TIMESTAMP    | Parsed time                                                                                               | `2024-02-10 10:15:00`                       |
| `updated_at`          | TIMESTAMP    | Updated time                                                                                              | `2024-02-15 14:30:00`                       |

**Indexes**: data_upload_id, uploaded_center_id, partner_id, approval_status

**Sample Data**:

```
ID: r0s2t4u6-8901-2345-67rs-890123456789
Data Upload ID: p8q0r2s4-6789-0123-45pq-678901234567
Uploaded Center ID: q9r1s3t5-7890-1234-56qr-789012345678
Partner ID: e7f9g1h3-5678-9012-34ef-567890123456
Batch Number: BATCH-2024-001
Batch Start Date: 2024-01-15
Batch Complete Date: 2024-07-15
Total Students: 45
Male Students: 30
Female Students: 15
Approval Status: approved
Approved Batch ID: o7p9q1r3-5678-9012-34op-567890123456
```

---

#### Table: `uploaded_students`

**Purpose**: Stores individual student records from CSV uploads pending approval. One row per student in the CSV.

**Key Fields**:

| Field Name               | Type         | Description                                                                                                                | Example                                           |
| ------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `id`                     | UUID         | Unique identifier                                                                                                          | `s1t3u5v7-9012-3456-78st-901234567890`            |
| `data_upload_id`         | UUID         | Which upload                                                                                                               | Links to `data_uploads.id`                        |
| `csv_center_id`          | VARCHAR(100) | Partner-provided center identifier from CSV (used to link student rows to specific uploaded_center/uploaded_batch entries) | `PUNE-C-001`                                      |
| `uploaded_batch_id`      | UUID         | Which batch                                                                                                                | Links to `uploaded_batches.id`                    |
| `uploaded_center_id`     | UUID         | Which center                                                                                                               | Links to `uploaded_centers.id`                    |
| `partner_id`             | UUID         | Partner                                                                                                                    | Links to `partners.id`                            |
| `student_id`             | VARCHAR(100) | Student ID from CSV                                                                                                        | `STUD-2024-0001`                                  |
| `student_name`           | VARCHAR(255) | Full name                                                                                                                  | `Rahul Sharma`                                    |
| `date_of_birth`          | DATE         | DOB                                                                                                                        | `2002-05-15`                                      |
| `gender`                 | VARCHAR(20)  | Gender                                                                                                                     | `Male`, `Female`, `Other`                         |
| `mobile_number`          | VARCHAR(20)  | Contact                                                                                                                    | `+91-9876543210`                                  |
| `email`                  | VARCHAR(255) | Email                                                                                                                      | `rahul.sharma@email.com`                          |
| `address`                | TEXT         | Address                                                                                                                    | `House 23, Street 5, Pune`                        |
| `city`                   | VARCHAR(100) | City                                                                                                                       | `Pune`                                            |
| `state`                  | VARCHAR(100) | State                                                                                                                      | `Maharashtra`                                     |
| `enrollment_date`        | DATE         | Enrolled on                                                                                                                | `2024-01-10`                                      |
| `course_name`            | VARCHAR(255) | Course                                                                                                                     | `Electrical & Electronics`                        |
| `course_duration_months` | INT          | Duration                                                                                                                   | `6`                                               |
| `training_status`        | VARCHAR(50)  | Status                                                                                                                     | `enrolled`, `in_progress`, `completed`, `dropped` |
| `approval_status`        | VARCHAR(50)  | Approval                                                                                                                   | `pending`, `approved`, `rejected`                 |
| `rejection_reason`       | TEXT         | Why rejected                                                                                                               | NULL                                              |
| `remarks`                | TEXT         | Admin notes                                                                                                                | NULL                                              |
| `approved_student_id`    | UUID         | Links to approved student (future table)                                                                                   | NULL (future)                                     |
| `created_at`             | TIMESTAMP    | Parsed                                                                                                                     | `2024-02-10 10:15:00`                             |
| `updated_at`             | TIMESTAMP    | Updated                                                                                                                    | `2024-02-15 14:30:00`                             |

**Indexes**: data_upload_id, uploaded_batch_id, uploaded_center_id, partner_id, approval_status, student_id

**Sample Data**:

```
ID: s1t3u5v7-9012-3456-78st-901234567890
Data Upload ID: p8q0r2s4-6789-0123-45pq-678901234567
Uploaded Batch ID: r0s2t4u6-8901-2345-67rs-890123456789
Uploaded Center ID: q9r1s3t5-7890-1234-56qr-789012345678
Partner ID: e7f9g1h3-5678-9012-34ef-567890123456
Student ID: STUD-2024-0001
Student Name: Rahul Sharma
Date of Birth: 2002-05-15
Gender: Male
Mobile: +91-9876543210
Email: rahul.sharma@email.com
Address: House 23, Street 5, Pune
City: Pune
State: Maharashtra
Enrollment Date: 2024-01-10
Course Name: Electrical & Electronics
Course Duration: 6 months
Training Status: in_progress
Approval Status: approved
```

---

### Category 6: Requests

**Concept**: Requests are the way partners communicate needs to admins. There are different types of requests: upload_request (admin asks partner to upload data), refurbishment, data_correction, support, etc.

---

#### Table: `requests`

**Purpose**: Generic table that stores all types of requests. This is the master request table that links to specialized tables like `refurbishment_requests`.

**Key Fields**:

| Field Name       | Type         | Description                        | Example                                                                          |
| ---------------- | ------------ | ---------------------------------- | -------------------------------------------------------------------------------- |
| `id`             | UUID         | Unique identifier                  | `t2u4v6w8-0123-4567-89tu-012345678901`                                           |
| `request_number` | VARCHAR(50)  | Human-readable request ID (unique) | `REQ-2024-00123`                                                                 |
| `type`           | VARCHAR(50)  | Type of request                    | `upload_request`, `refurbishment`, `upgradation`, `data_correction`, `support`   |
| `partner_id`     | UUID         | Which partner                      | Links to `partners.id`                                                           |
| `center_id`      | UUID         | Which center (if applicable)       | Links to `centers.id` (NULL for partner-level requests)                          |
| `title`          | VARCHAR(255) | Request title                      | `Refurbishment Request for Electrical Lab`                                       |
| `description`    | TEXT         | Detailed description               | `Need to replace old equipment in electrical lab`                                |
| `priority`       | VARCHAR(20)  | Priority level                     | `low`, `medium`, `high`, `urgent`                                                |
| `status`         | VARCHAR(50)  | Request status                     | `pending`, `partner_submitted`, `in_review`, `approved`, `rejected`, `completed` |
| `created_by`     | UUID         | Who created (usually partner user) | Links to `users.id`                                                              |
| `assigned_to`    | UUID         | Which admin is handling            | Links to `users.id`                                                              |
| `reviewed_by`    | UUID         | Who reviewed                       | Links to `users.id`                                                              |
| `reviewed_at`    | TIMESTAMP    | Review time                        | `2024-03-15 14:30:00`                                                            |
| `completed_at`   | TIMESTAMP    | Completion time                    | `2024-04-10 10:00:00`                                                            |
| `created_at`     | TIMESTAMP    | Created time                       | `2024-03-01 09:00:00`                                                            |
| `updated_at`     | TIMESTAMP    | Last update                        | `2024-04-10 10:00:00`                                                            |

**Status Flow**:

1. `pending` - Request created, waiting for partner action (for admin-created requests) or admin review (for partner-created requests)
2. `partner_submitted` - Partner has submitted their selections/information
3. `in_review` - Admin is actively reviewing
4. `approved` - Admin approved
5. `rejected` - Admin rejected with reason
6. `completed` - Request fully completed

**Indexes**: request_number (unique), type, partner_id, center_id, status, created_by

**Relationships**:

- Links to `partners.id`, `centers.id`, `users.id`
- Has one-to-one relationship with `refurbishment_requests` (if type=refurbishment)
- Referenced by `scheduled_requests`, `request_attachments`, `request_comments`

**Sample Data**:

```
ID: t2u4v6w8-0123-4567-89tu-012345678901
Request Number: REQ-2024-00123
Type: refurbishment
Partner ID: e7f9g1h3-5678-9012-34ef-567890123456
Center ID: l4m6n8o0-2345-6789-01lm-234567890123
Title: Refurbishment Request for Electrical Lab
Description: Equipment in electrical lab is outdated and needs replacement
Priority: high
Status: approved
Created By: a3b5c7d9-1234-5678-90ab-cdef12345678 (admin created)
Assigned To: a3b5c7d9-1234-5678-90ab-cdef12345678
Reviewed By: a3b5c7d9-1234-5678-90ab-cdef12345678
Reviewed At: 2024-03-15 14:30:00
Completed At: NULL (not yet completed)
Created At: 2024-03-01 09:00:00
```

---

#### Table: `scheduled_requests`

**Purpose**: Manages recurring requests. Admin can schedule upload requests to be sent to partners automatically (monthly, quarterly, annually, etc.).

**Key Fields**:

| Field Name            | Type        | Description                        | Example                                                                |
| --------------------- | ----------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `id`                  | UUID        | Unique identifier                  | `u3v5w7x9-1234-5678-90uv-123456789012`                                 |
| `request_id`          | UUID        | Which request to schedule          | Links to `requests.id`                                                 |
| `recurrence_type`     | VARCHAR(50) | How often                          | `immediate`, `monthly`, `quarterly`, `semi_annual`, `annual`, `custom` |
| `start_date`          | DATE        | When to start                      | `2024-01-01`                                                           |
| `end_date`            | DATE        | When to stop (NULL for indefinite) | `2024-12-31` or NULL                                                   |
| `next_scheduled_date` | DATE        | Next execution date                | `2024-12-01`                                                           |
| `last_executed_at`    | TIMESTAMP   | Last execution time                | `2024-11-01 09:00:00`                                                  |
| `is_active`           | BOOLEAN     | Is schedule active?                | `true` or `false`                                                      |
| `created_at`          | TIMESTAMP   | Created                            | `2024-01-01 10:00:00`                                                  |
| `updated_at`          | TIMESTAMP   | Updated                            | `2024-11-01 09:00:00`                                                  |

**How it works**: A background job runs daily and checks this table. When `next_scheduled_date <= TODAY` and `is_active = true`, it creates a notification to the partner and updates `last_executed_at` and `next_scheduled_date`.

**Indexes**: request_id, next_scheduled_date, is_active, recurrence_type

**Relationships**:

- Links to `requests.id`

**Sample Data**:

```
ID: u3v5w7x9-1234-5678-90uv-123456789012
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
Recurrence Type: monthly
Start Date: 2024-01-01
End Date: 2024-12-31
Next Scheduled Date: 2024-12-01
Last Executed At: 2024-11-01 09:00:00
Is Active: true
Created At: 2024-01-01 10:00:00
```

---

#### Table: `refurbishment_requests`

**Purpose**: Stores additional details specific to refurbishment requests. Links one-to-one with `requests` table when request type is 'refurbishment'.

**Key Fields**:

| Field Name           | Type          | Description                      | Example                                                      |
| -------------------- | ------------- | -------------------------------- | ------------------------------------------------------------ |
| `id`                 | UUID          | Unique identifier                | `v4w6x8y0-2345-6789-01vw-234567890123`                       |
| `request_id`         | UUID          | Links to main request (unique)   | Links to `requests.id`                                       |
| `center_id`          | UUID          | Which center needs refurbishment | Links to `centers.id`                                        |
| `refurbishment_type` | VARCHAR(50)   | Type                             | `refurbishment`, `upgradation`, `both`                       |
| `estimated_cost`     | DECIMAL(12,2) | Estimated cost                   | `500000.00` (â‚¹5 lakhs)                                     |
| `approved_cost`      | DECIMAL(12,2) | Final approved cost              | `450000.00` (â‚¹4.5 lakhs)                                   |
| `justification`      | TEXT          | Overall justification            | `Lab equipment is 10 years old and frequently breaking down` |
| `created_at`         | TIMESTAMP     | Created                          | `2024-03-01 09:00:00`                                        |
| `updated_at`         | TIMESTAMP     | Updated                          | `2024-03-15 14:30:00`                                        |

**Relationships**:

- Links to `requests.id` (one-to-one)
- Links to `centers.id`
- Referenced by course-specific refurbishment tables

**Sample Data**:

```
ID: v4w6x8y0-2345-6789-01vw-234567890123
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
Center ID: l4m6n8o0-2345-6789-01lm-234567890123
Refurbishment Type: both
Estimated Cost: 500000.00
Approved Cost: 450000.00
Justification: Lab equipment is 10 years old and frequently breaking down
Created At: 2024-03-01 09:00:00
```

---

### Category 7: Refurbishment System

**Important Concept**: The refurbishment flow is course-based. Admin creates a request and pre-selects packages for each course. Partner then selects from those pre-selected packages course-by-course, adds justification and photos for each course. Optionally, partner can request room upgradation with dimensions and photos.

---

#### Table: `refurbishment_packages`

**Purpose**: Master list of all available refurbishment items/equipment that can be requested (like "Electrical Multimeter Set", "Solar Panel Kit", "Lab Benches", etc.).

**Key Fields**:

| Field Name      | Type         | Description          | Example                                                        |
| --------------- | ------------ | -------------------- | -------------------------------------------------------------- |
| `id`            | UUID         | Unique identifier    | `w5x7y9z1-3456-7890-12wx-345678901234`                         |
| `package_name`  | VARCHAR(255) | Package name         | `Electrical Multimeter Set (10 units)`                         |
| `description`   | TEXT         | Details              | `Digital multimeters with auto-ranging, includes storage case` |
| `category`      | VARCHAR(100) | Category             | `electrical`, `furniture`, `equipment`, `infrastructure`       |
| `is_active`     | BOOLEAN      | Currently available? | `true` or `false`                                              |
| `display_order` | INT          | Display order in UI  | `1`, `2`, `3`...                                               |
| `created_at`    | TIMESTAMP    | Created              | `2024-01-01 10:00:00`                                          |
| `updated_at`    | TIMESTAMP    | Updated              | `2024-06-15 11:00:00`                                          |

**Relationships**:

- Linked to courses via `course_packages` table
- Referenced by all refurbishment selection tables

**Sample Data**:

```
ID: w5x7y9z1-3456-7890-12wx-345678901234
Package Name: Electrical Multimeter Set (10 units)
Description: Digital multimeters with auto-ranging, includes storage case
Category: electrical
Is Active: true
Display Order: 1
```

```
ID: x6y8z0a2-4567-8901-23xy-456789012345
Package Name: Solar Panel Installation Kit
Description: 5KW solar panel system with inverter and mounting hardware
Category: equipment
Is Active: true
Display Order: 2
```

```
ID: y7z9a1b3-5678-9012-34yz-567890123456
Package Name: Student Lab Benches (20 units)
Description: Sturdy work benches with power outlets and storage
Category: furniture
Is Active: true
Display Order: 3
```

---

#### Table: `refurbishment_admin_selected_packages`

**Purpose**: When admin creates a refurbishment request, admin pre-selects which packages are available for each course. This table stores those pre-selections. Partner will only be able to choose from these pre-selected packages.

**Key Fields**:

| Field Name   | Type      | Description         | Example                                |
| ------------ | --------- | ------------------- | -------------------------------------- |
| `id`         | UUID      | Unique identifier   | `a9b1c3d5-7890-1234-56ab-789012345678` |
| `request_id` | UUID      | Which request       | Links to `requests.id`                 |
| `course_id`  | UUID      | Which course        | Links to `courses.id`                  |
| `package_id` | UUID      | Which package       | Links to `refurbishment_packages.id`   |
| `created_at` | TIMESTAMP | When admin selected | `2024-03-01 09:30:00`                  |

**Example Flow**:

- Admin creates refurbishment request for a center
- Center offers 3 courses: Electrical, Solar, Industrial Automation
- For Electrical course, admin pre-selects: "Multimeter Set", "Oscilloscope", "Lab Benches"
- For Solar course, admin pre-selects: "Solar Panel Kit", "Inverter System"
- These selections are stored here, one row per package per course

**Indexes**: request_id, course_id, package_id

**Relationships**:

- Links to `requests.id`, `courses.id`, `refurbishment_packages.id`

**Sample Data**:

```
ID: a9b1c3d5-7890-1234-56ab-789012345678
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
Course ID: f8g0h2i4-6789-0123-45fg-678901234567 (Electrical & Electronics)
Package ID: w5x7y9z1-3456-7890-12wx-345678901234 (Multimeter Set)
Created At: 2024-03-01 09:30:00
```

```
ID: b0c2d4e6-8901-2345-67bc-890123456789
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
Course ID: g9h1i3j5-7890-1234-56gh-789012345678 (Solar Technology)
Package ID: x6y8z0a2-4567-8901-23xy-456789012345 (Solar Panel Kit)
Created At: 2024-03-01 09:30:00
```

---

#### Table: `refurbishment_request_course_packages`

**Purpose**: Stores partner's final selections. After admin pre-selects packages, partner reviews them course-by-course and selects which ones they actually need, along with justification for each course.

**Key Fields**:

| Field Name                 | Type      | Description                      | Example                                                              |
| -------------------------- | --------- | -------------------------------- | -------------------------------------------------------------------- |
| `id`                       | UUID      | Unique identifier                | `c1d3e5f7-9012-3456-78cd-901234567890`                               |
| `refurbishment_request_id` | UUID      | Which refurbishment request      | Links to `refurbishment_requests.id`                                 |
| `course_id`                | UUID      | Which course                     | Links to `courses.id`                                                |
| `package_id`               | UUID      | Which package                    | Links to `refurbishment_packages.id`                                 |
| `quantity`                 | INT       | How many                         | `1`, `2`, etc.                                                       |
| `justification`            | TEXT      | Partner's explanation per course | `Current multimeters are faulty. Need replacements for 40 students.` |
| `created_at`               | TIMESTAMP | When partner selected            | `2024-03-05 15:00:00`                                                |
| `updated_at`               | TIMESTAMP | Last update                      | `2024-03-05 15:00:00`                                                |

**Example**:

- Partner sees admin pre-selected 3 packages for Electrical course
- Partner selects 2 of them (doesn't need the third)
- Partner writes justification: "Current equipment is 8 years old and not working properly"
- Partner uploads photos showing damaged equipment (stored in next table)

**Indexes**: refurbishment_request_id, course_id, package_id

**Relationships**:

- Links to `refurbishment_requests.id`, `courses.id`, `refurbishment_packages.id`

**Sample Data**:

```
ID: c1d3e5f7-9012-3456-78cd-901234567890
Refurbishment Request ID: v4w6x8y0-2345-6789-01vw-234567890123
Course ID: f8g0h2i4-6789-0123-45fg-678901234567 (Electrical & Electronics)
Package ID: w5x7y9z1-3456-7890-12wx-345678901234 (Multimeter Set)
Quantity: 1
Justification: Current multimeters are faulty and showing incorrect readings. Need replacements urgently for 40 students in current batch.
Created At: 2024-03-05 15:00:00
```

---

#### Table: `refurbishment_request_course_attachments`

**Purpose**: Stores photos that partner uploads per course showing the current condition of equipment/facilities that need refurbishment.

**Key Fields**:

| Field Name                 | Type         | Description       | Example                                                         |
| -------------------------- | ------------ | ----------------- | --------------------------------------------------------------- |
| `id`                       | UUID         | Unique identifier | `d2e4f6g8-0123-4567-89de-012345678901`                          |
| `refurbishment_request_id` | UUID         | Which request     | Links to `refurbishment_requests.id`                            |
| `course_id`                | UUID         | Which course      | Links to `courses.id`                                           |
| `file_url`                 | VARCHAR(500) | S3 URL of photo   | `s3://seif-refurbishment/request-123/electrical-lab-photo1.jpg` |
| `file_name`                | VARCHAR(255) | Original filename | `electrical_lab_damaged_multimeter.jpg`                         |
| `file_size_bytes`          | BIGINT       | File size         | `2458632` (2.4 MB)                                              |
| `file_mime_type`           | VARCHAR(100) | File type         | `image/jpeg`                                                    |
| `uploaded_by`              | UUID         | Who uploaded      | Links to `users.id`                                             |
| `created_at`               | TIMESTAMP    | Upload time       | `2024-03-05 15:05:00`                                           |

**Example**: Partner uploads 3 photos for Electrical course showing broken equipment, 2 photos for Solar course showing old panels.

**Indexes**: refurbishment_request_id, course_id

**Relationships**:

- Links to `refurbishment_requests.id`, `courses.id`, `users.id`

**Sample Data**:

```
ID: d2e4f6g8-0123-4567-89de-012345678901
Refurbishment Request ID: v4w6x8y0-2345-6789-01vw-234567890123
Course ID: f8g0h2i4-6789-0123-45fg-678901234567 (Electrical)
File URL: s3://seif-refurbishment/request-v4w6/elec-damaged-multimeter.jpg
File Name: electrical_lab_damaged_multimeter.jpg
File Size: 2458632 bytes
File Type: image/jpeg
Uploaded By: b4c6d8e0-2345-6789-01bc-def123456789 (partner user)
Created At: 2024-03-05 15:05:00
```

---

#### Table: `refurbishment_upgradation_rooms`

**Purpose**: If partner wants to upgrade a room (expand size, increase height, etc.), they provide room dimensions here. This is optional - not all refurbishment requests include upgradation.

**Key Fields**:

| Field Name                 | Type         | Description            | Example                                                                                      |
| -------------------------- | ------------ | ---------------------- | -------------------------------------------------------------------------------------------- |
| `id`                       | UUID         | Unique identifier      | `e3f5g7h9-1234-5678-90ef-123456789012`                                                       |
| `refurbishment_request_id` | UUID         | Which request          | Links to `refurbishment_requests.id`                                                         |
| `room_name`                | VARCHAR(255) | Room name              | `Electrical Lab Room 1`                                                                      |
| `length_meters`            | DECIMAL(6,2) | Length                 | `12.50` meters                                                                               |
| `breadth_meters`           | DECIMAL(6,2) | Width                  | `8.00` meters                                                                                |
| `height_meters`            | DECIMAL(6,2) | Height                 | `3.50` meters                                                                                |
| `justification`            | TEXT         | Why upgradation needed | `Current room is too small for 50 students. Need to expand to accommodate more workbenches.` |
| `created_at`               | TIMESTAMP    | Created                | `2024-03-05 15:10:00`                                                                        |
| `updated_at`               | TIMESTAMP    | Updated                | `2024-03-05 15:10:00`                                                                        |

**Note**: Currently, UI allows only ONE room per request, but schema supports multiple rooms for future extensibility.

**Indexes**: refurbishment_request_id

**Relationships**:

- Links to `refurbishment_requests.id`
- Referenced by `refurbishment_upgradation_photos`

**Sample Data**:

```
ID: e3f5g7h9-1234-5678-90ef-123456789012
Refurbishment Request ID: v4w6x8y0-2345-6789-01vw-234567890123
Room Name: Electrical Lab Room 1
Length: 12.50 meters
Breadth: 8.00 meters
Height: 3.50 meters
Justification: Current room is too small for 50 students. Need to expand by 4 meters to accommodate more workbenches and allow proper spacing between students for safety.
Created At: 2024-03-05 15:10:00
```

---

#### Table: `refurbishment_upgradation_photos`

**Purpose**: Photos of the room that partner wants to upgrade. Shows current condition and helps admin understand the upgradation need.

**Key Fields**:

| Field Name            | Type         | Description       | Example                                               |
| --------------------- | ------------ | ----------------- | ----------------------------------------------------- |
| `id`                  | UUID         | Unique identifier | `f4g6h8i0-2345-6789-01fg-234567890123`                |
| `upgradation_room_id` | UUID         | Which room        | Links to `refurbishment_upgradation_rooms.id`         |
| `file_url`            | VARCHAR(500) | S3 URL            | `s3://seif-refurbishment/request-123/room-photo1.jpg` |
| `file_name`           | VARCHAR(255) | Filename          | `electrical_lab_current_state.jpg`                    |
| `file_size_bytes`     | BIGINT       | File size         | `3125478`                                             |
| `file_mime_type`      | VARCHAR(100) | Type              | `image/jpeg`                                          |
| `uploaded_by`         | UUID         | Who uploaded      | Links to `users.id`                                   |
| `created_at`          | TIMESTAMP    | Upload time       | `2024-03-05 15:12:00`                                 |

**Indexes**: upgradation_room_id

**Relationships**:

- Links to `refurbishment_upgradation_rooms.id`, `users.id`

**Sample Data**:

```
ID: f4g6h8i0-2345-6789-01fg-234567890123
Upgradation Room ID: e3f5g7h9-1234-5678-90ef-123456789012
File URL: s3://seif-refurbishment/request-v4w6/room-current-crowded.jpg
File Name: electrical_lab_current_state_crowded.jpg
File Size: 3125478 bytes
File Type: image/jpeg
Uploaded By: b4c6d8e0-2345-6789-01bc-def123456789
Created At: 2024-03-05 15:12:00
```

---

### Category 8: Request Support

---

#### Table: `request_attachments`

**Purpose**: General file attachments for any request (not course-specific). Used for supporting documents, forms, certificates, etc.

**Key Fields**:

| Field Name        | Type         | Description       | Example                                       |
| ----------------- | ------------ | ----------------- | --------------------------------------------- |
| `id`              | UUID         | Unique identifier | `g5h7i9j1-3456-7890-12gh-345678901234`        |
| `request_id`      | UUID         | Which request     | Links to `requests.id`                        |
| `file_url`        | VARCHAR(500) | S3 URL            | `s3://seif-requests/request-123/document.pdf` |
| `file_name`       | VARCHAR(255) | Filename          | `center_assessment_report.pdf`                |
| `file_size_bytes` | BIGINT       | File size         | `1458920`                                     |
| `file_mime_type`  | VARCHAR(100) | Type              | `application/pdf`                             |
| `uploaded_by`     | UUID         | Who uploaded      | Links to `users.id`                           |
| `created_at`      | TIMESTAMP    | Upload time       | `2024-03-02 11:00:00`                         |

**Indexes**: request_id

**Sample Data**:

```
ID: g5h7i9j1-3456-7890-12gh-345678901234
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
File URL: s3://seif-requests/request-t2u4/assessment-report.pdf
File Name: center_infrastructure_assessment.pdf
File Size: 1458920 bytes
File Type: application/pdf
Uploaded By: a3b5c7d9-1234-5678-90ab-cdef12345678 (admin)
Created At: 2024-03-02 11:00:00
```

---

#### Table: `request_comments`

**Purpose**: Discussion thread on requests. Admins and partners can add comments. Some comments can be marked "internal" (only visible to admins).

**Key Fields**:

| Field Name    | Type      | Description                    | Example                                           |
| ------------- | --------- | ------------------------------ | ------------------------------------------------- |
| `id`          | UUID      | Unique identifier              | `h6i8j0k2-4567-8901-23hi-456789012345`            |
| `request_id`  | UUID      | Which request                  | Links to `requests.id`                            |
| `user_id`     | UUID      | Who commented                  | Links to `users.id`                               |
| `comment`     | TEXT      | Comment text                   | `Equipment looks very old. Approval recommended.` |
| `is_internal` | BOOLEAN   | Internal (admin-only) comment? | `true` or `false`                                 |
| `created_at`  | TIMESTAMP | Comment time                   | `2024-03-10 14:30:00`                             |
| `updated_at`  | TIMESTAMP | Edit time                      | `2024-03-10 14:30:00`                             |

**Indexes**: request_id, user_id

**Sample Data**:

```
ID: h6i8j0k2-4567-8901-23hi-456789012345
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
User ID: a3b5c7d9-1234-5678-90ab-cdef12345678 (admin)
Comment: Equipment looks very old based on photos. Approval recommended. Budget: â‚¹4.5 lakhs.
Is Internal: true (only admins can see)
Created At: 2024-03-10 14:30:00
```

```
ID: i7j9k1l3-5678-9012-34ij-567890123456
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
User ID: b4c6d8e0-2345-6789-01bc-def123456789 (partner)
Comment: Thank you for approving. When can we expect delivery?
Is Internal: false (visible to both)
Created At: 2024-03-16 10:00:00
```

---

### Category 9: Notifications

---

#### Table: `notifications`

**Purpose**: Stores all in-app notifications and alerts. When something important happens (upload approved, request status changed), a notification is created here and shown in user's inbox.

**Key Fields**:

| Field Name            | Type         | Description                         | Example                                                           |
| --------------------- | ------------ | ----------------------------------- | ----------------------------------------------------------------- |
| `id`                  | UUID         | Unique identifier                   | `j8k0l2m4-6789-0123-45jk-678901234567`                            |
| `recipient_id`        | UUID         | Who should see this (specific user) | Links to `users.id` (NULL if broadcast to role)                   |
| `recipient_role`      | VARCHAR(50)  | Broadcast to all users of this role | `ADMIN`, `PARTNER`, NULL (if specific user)                       |
| `type`                | VARCHAR(50)  | Notification category               | `upload`, `approval`, `rejection`, `request`, `alert`             |
| `alert_type`          | VARCHAR(50)  | Used in Alerts tab                  | `refurbishment`, `data_approval`, `data_reject`, `upload_request` |
| `title`               | VARCHAR(255) | Notification title                  | `Upload Approved`                                                 |
| `message`             | TEXT         | Main message                        | `Your upload for Pune Center has been approved by admin.`         |
| `remark`              | TEXT         | Admin's additional remarks          | `All data looks good. Added to main database.`                    |
| `payload`             | JSON         | Extra structured data               | `{"upload_id": "p8q0r2s4-...", "center_name": "Pune Center 1"}`   |
| `related_entity_type` | VARCHAR(50)  | What this notification is about     | `request`, `partner`, `center`, `data_upload`                     |
| `related_entity_id`   | UUID         | ID of related entity                | Links to respective table                                         |
| `is_read`             | BOOLEAN      | Has user read it?                   | `true` or `false`                                                 |
| `read_at`             | TIMESTAMP    | When read                           | `2024-03-15 16:00:00` or NULL                                     |
| `sent_via`            | VARCHAR(20)  | Delivery method                     | `in_app` (only method used currently)                             |
| `email_sent_at`       | TIMESTAMP    | Email sent time                     | NULL (emails not sent currently)                                  |
| `created_at`          | TIMESTAMP    | Notification created                | `2024-03-15 14:30:00`                                             |

**Partner Inbox - Alerts Tab**: Shows notifications with these columns:

- Date (created_at)
- Type (alert_type)
- Title
- Remark
- Status (from related request)
- Action (View button)

**Indexes**: recipient_id, recipient_role, is_read, type, alert_type, created_at

**Sample Data**:

```
ID: j8k0l2m4-6789-0123-45jk-678901234567
Recipient ID: b4c6d8e0-2345-6789-01bc-def123456789 (partner user)
Recipient Role: NULL
Type: approval
Alert Type: data_approval
Title: Upload Approved
Message: Your upload for Pune Center Batch Jan 2024 has been approved.
Remark: All data looks good. Added to main database.
Payload: {"upload_id": "p8q0r2s4-6789-0123-45pq-678901234567", "center_name": "Pune Center 1"}
Related Entity Type: data_upload
Related Entity ID: p8q0r2s4-6789-0123-45pq-678901234567
Is Read: true
Read At: 2024-03-15 16:00:00
Sent Via: in_app
Created At: 2024-03-15 14:30:00
```

```
ID: k9l1m3n5-7890-1234-56kl-789012345678
Recipient ID: b4c6d8e0-2345-6789-01bc-def123456789
Recipient Role: NULL
Type: alert
Alert Type: refurbishment
Title: Refurbishment Request Created
Message: A refurbishment request has been created for your center.
Remark: Please review and select required packages course-wise.
Related Entity Type: request
Related Entity ID: t2u4v6w8-0123-4567-89tu-012345678901
Is Read: false
Read At: NULL
Sent Via: in_app
Created At: 2024-03-01 09:45:00
```

---

### Category 10: Reporting & Audit

---

#### Table: `download_logs`

**Purpose**: Tracks all report downloads by SEIF users (ESSCI role). Helps audit who downloaded what data and when.

**Key Fields**:

| Field Name      | Type         | Description            | Example                                                      |
| --------------- | ------------ | ---------------------- | ------------------------------------------------------------ |
| `id`            | UUID         | Unique identifier      | `l0m2n4o6-8901-2345-67lm-890123456789`                       |
| `user_id`       | UUID         | Who downloaded         | Links to `users.id`                                          |
| `download_type` | VARCHAR(50)  | Type of report         | `center_wise`, `partner_wise`, `batch_wise`                  |
| `partner_id`    | UUID         | If filtered by partner | Links to `partners.id`                                       |
| `center_id`     | UUID         | If filtered by center  | Links to `centers.id`                                        |
| `file_name`     | VARCHAR(255) | Downloaded filename    | `centers_maharashtra_report_2024-11-05.xlsx`                 |
| `record_count`  | INT          | How many records       | `150`                                                        |
| `filters`       | JSON         | Applied filters        | `{"state": "Maharashtra", "year": 2024, "status": "active"}` |
| `created_at`    | TIMESTAMP    | Download time          | `2024-11-05 10:30:00`                                        |

**Indexes**: user_id, download_type, partner_id, center_id, created_at

**Sample Data**:

```
ID: l0m2n4o6-8901-2345-67lm-890123456789
User ID: m1n3o5p7-9012-3456-78mn-901234567890 (ESSCI user)
Download Type: center_wise
Partner ID: NULL (all partners)
Center ID: NULL (all centers)
File Name: all_centers_maharashtra_2024-11-05.xlsx
Record Count: 150
Filters: {"state": "Maharashtra", "status": "active", "region": "West"}
Created At: 2024-11-05 10:30:00
```

---

#### Table: `audit_logs`

**Purpose**: Complete activity trail. Every important action (login, create, update, delete, approve, reject) is logged here with details of what changed.

**Key Fields**:

| Field Name    | Type         | Description                 | Example                                                                                    |
| ------------- | ------------ | --------------------------- | ------------------------------------------------------------------------------------------ |
| `id`          | UUID         | Unique identifier           | `n2o4p6q8-0123-4567-89no-012345678901`                                                     |
| `user_id`     | UUID         | Who did it                  | Links to `users.id`                                                                        |
| `action`      | VARCHAR(100) | What action                 | `login`, `logout`, `create`, `update`, `delete`, `approve`, `reject`, `upload`, `download` |
| `entity_type` | VARCHAR(50)  | What was affected           | `user`, `partner`, `center`, `batch`, `request`, `data_upload`                             |
| `entity_id`   | UUID         | Which record                | ID from respective table                                                                   |
| `changes`     | JSON         | What changed (before/after) | `{"status": {"old": "pending", "new": "approved"}}`                                        |
| `ip_address`  | VARCHAR(45)  | User's IP                   | `103.255.123.45`                                                                           |
| `user_agent`  | TEXT         | Browser info                | `Mozilla/5.0 (Windows NT 10.0; Win64; x64)...`                                             |
| `created_at`  | TIMESTAMP    | When                        | `2024-03-15 14:30:00`                                                                      |

**Indexes**: user_id, entity_type, entity_id, action, created_at

**Sample Data**:

```
ID: n2o4p6q8-0123-4567-89no-012345678901
User ID: a3b5c7d9-1234-5678-90ab-cdef12345678 (admin)
Action: approve
Entity Type: data_upload
Entity ID: p8q0r2s4-6789-0123-45pq-678901234567
Changes: {
  "status": {"old": "pending", "new": "approved"},
  "reviewed_by": {"old": null, "new": "a3b5c7d9-1234-5678-90ab-cdef12345678"},
  "reviewed_at": {"old": null, "new": "2024-03-15 14:30:00"}
}
IP Address: 103.255.123.45
User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0
Created At: 2024-03-15 14:30:00
```

---

#### Table: `scheduled_requests`

**Purpose**: Manages recurring requests. Admin can schedule upload requests to be sent to partners automatically (monthly, quarterly, annually, etc.).

**Key Fields**:

| Field Name            | Type        | Description                        | Example                                                                |
| --------------------- | ----------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `id`                  | UUID        | Unique identifier                  | `u3v5w7x9-1234-5678-90uv-123456789012`                                 |
| `request_id`          | UUID        | Which request to schedule          | Links to `requests.id`                                                 |
| `recurrence_type`     | VARCHAR(50) | How often                          | `immediate`, `monthly`, `quarterly`, `semi_annual`, `annual`, `custom` |
| `start_date`          | DATE        | When to start                      | `2024-01-01`                                                           |
| `end_date`            | DATE        | When to stop (NULL for indefinite) | `2024-12-31` or NULL                                                   |
| `next_scheduled_date` | DATE        | Next execution date                | `2024-12-01`                                                           |
| `last_executed_at`    | TIMESTAMP   | Last execution time                | `2024-11-01 09:00:00`                                                  |
| `is_active`           | BOOLEAN     | Is schedule active?                | `true` or `false`                                                      |
| `created_at`          | TIMESTAMP   | Created                            | `2024-01-01 10:00:00`                                                  |
| `updated_at`          | TIMESTAMP   | Updated                            | `2024-11-01 09:00:00`                                                  |

**How it works**: A background job runs daily and checks this table. When `next_scheduled_date <= TODAY` and `is_active = true`, it creates a notification to the partner and updates `last_executed_at` and `next_scheduled_date`.

**Indexes**: request_id, next_scheduled_date, is_active, recurrence_type

**Relationships**:

- Links to `requests.id`

**Sample Data**:

```
ID: u3v5w7x9-1234-5678-90uv-123456789012
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
Recurrence Type: monthly
Start Date: 2024-01-01
End Date: 2024-12-31
Next Scheduled Date: 2024-12-01
Last Executed At: 2024-11-01 09:00:00
Is Active: true
Created At: 2024-01-01 10:00:00
```

---

#### Table: `refurbishment_requests`

**Purpose**: Stores additional details specific to refurbishment requests. Links one-to-one with `requests` table when request type is 'refurbishment'.

**Key Fields**:

| Field Name           | Type          | Description                      | Example                                                      |
| -------------------- | ------------- | -------------------------------- | ------------------------------------------------------------ |
| `id`                 | UUID          | Unique identifier                | `v4w6x8y0-2345-6789-01vw-234567890123`                       |
| `request_id`         | UUID          | Links to main request (unique)   | Links to `requests.id`                                       |
| `center_id`          | UUID          | Which center needs refurbishment | Links to `centers.id`                                        |
| `refurbishment_type` | VARCHAR(50)   | Type                             | `refurbishment`, `upgradation`, `both`                       |
| `estimated_cost`     | DECIMAL(12,2) | Estimated cost                   | `500000.00` (â‚¹5 lakhs)                                     |
| `approved_cost`      | DECIMAL(12,2) | Final approved cost              | `450000.00` (â‚¹4.5 lakhs)                                   |
| `justification`      | TEXT          | Overall justification            | `Lab equipment is 10 years old and frequently breaking down` |
| `created_at`         | TIMESTAMP     | Created                          | `2024-03-01 09:00:00`                                        |
| `updated_at`         | TIMESTAMP     | Updated                          | `2024-03-15 14:30:00`                                        |

**Relationships**:

- Links to `requests.id` (one-to-one)
- Links to `centers.id`
- Referenced by course-specific refurbishment tables

**Sample Data**:

```
ID: v4w6x8y0-2345-6789-01vw-234567890123
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
Center ID: l4m6n8o0-2345-6789-01lm-234567890123
Refurbishment Type: both
Estimated Cost: 500000.00
Approved Cost: 450000.00
Justification: Lab equipment is 10 years old and frequently breaking down
Created At: 2024-03-01 09:00:00
```

---

### Category 7: Refurbishment System

**Important Concept**: The refurbishment flow is course-based. Admin creates a request and pre-selects packages for each course. Partner then selects from those pre-selected packages course-by-course, adds justification and photos for each course. Optionally, partner can request room upgradation with dimensions and photos.

---

#### Table: `refurbishment_packages`

**Purpose**: Master list of all available refurbishment items/equipment that can be requested (like "Electrical Multimeter Set", "Solar Panel Kit", "Lab Benches", etc.).

**Key Fields**:

| Field Name      | Type         | Description          | Example                                                        |
| --------------- | ------------ | -------------------- | -------------------------------------------------------------- |
| `id`            | UUID         | Unique identifier    | `w5x7y9z1-3456-7890-12wx-345678901234`                         |
| `package_name`  | VARCHAR(255) | Package name         | `Electrical Multimeter Set (10 units)`                         |
| `description`   | TEXT         | Details              | `Digital multimeters with auto-ranging, includes storage case` |
| `category`      | VARCHAR(100) | Category             | `electrical`, `furniture`, `equipment`, `infrastructure`       |
| `is_active`     | BOOLEAN      | Currently available? | `true` or `false`                                              |
| `display_order` | INT          | Display order in UI  | `1`, `2`, `3`...                                               |
| `created_at`    | TIMESTAMP    | Created              | `2024-01-01 10:00:00`                                          |
| `updated_at`    | TIMESTAMP    | Updated              | `2024-06-15 11:00:00`                                          |

**Relationships**:

- Linked to courses via `course_packages` table
- Referenced by all refurbishment selection tables

**Sample Data**:

```
ID: w5x7y9z1-3456-7890-12wx-345678901234
Package Name: Electrical Multimeter Set (10 units)
Description: Digital multimeters with auto-ranging, includes storage case
Category: electrical
Is Active: true
Display Order: 1
```

```
ID: x6y8z0a2-4567-8901-23xy-456789012345
Package Name: Solar Panel Installation Kit
Description: 5KW solar panel system with inverter and mounting hardware
Category: equipment
Is Active: true
Display Order: 2
```

```
ID: y7z9a1b3-5678-9012-34yz-567890123456
Package Name: Student Lab Benches (20 units)
Description: Sturdy work benches with power outlets and storage
Category: furniture
Is Active: true
Display Order: 3
```

---

#### Table: `refurbishment_admin_selected_packages`

**Purpose**: When admin creates a refurbishment request, admin pre-selects which packages are available for each course. This table stores those pre-selections. Partner will only be able to choose from these pre-selected packages.

**Key Fields**:

| Field Name   | Type      | Description         | Example                                |
| ------------ | --------- | ------------------- | -------------------------------------- |
| `id`         | UUID      | Unique identifier   | `a9b1c3d5-7890-1234-56ab-789012345678` |
| `request_id` | UUID      | Which request       | Links to `requests.id`                 |
| `course_id`  | UUID      | Which course        | Links to `courses.id`                  |
| `package_id` | UUID      | Which package       | Links to `refurbishment_packages.id`   |
| `created_at` | TIMESTAMP | When admin selected | `2024-03-01 09:30:00`                  |

**Example Flow**:

- Admin creates refurbishment request for a center
- Center offers 3 courses: Electrical, Solar, Industrial Automation
- For Electrical course, admin pre-selects: "Multimeter Set", "Oscilloscope", "Lab Benches"
- For Solar course, admin pre-selects: "Solar Panel Kit", "Inverter System"
- These selections are stored here, one row per package per course

**Indexes**: request_id, course_id, package_id

**Relationships**:

- Links to `requests.id`, `courses.id`, `refurbishment_packages.id`

**Sample Data**:

```
ID: a9b1c3d5-7890-1234-56ab-789012345678
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
Course ID: f8g0h2i4-6789-0123-45fg-678901234567 (Electrical & Electronics)
Package ID: w5x7y9z1-3456-7890-12wx-345678901234 (Multimeter Set)
Created At: 2024-03-01 09:30:00
```

```
ID: b0c2d4e6-8901-2345-67bc-890123456789
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
Course ID: g9h1i3j5-7890-1234-56gh-789012345678 (Solar Technology)
Package ID: x6y8z0a2-4567-8901-23xy-456789012345 (Solar Panel Kit)
Created At: 2024-03-01 09:30:00
```

---

#### Table: `refurbishment_request_course_packages`

**Purpose**: Stores partner's final selections. After admin pre-selects packages, partner reviews them course-by-course and selects which ones they actually need, along with justification for each course.

**Key Fields**:

| Field Name                 | Type      | Description                      | Example                                                              |
| -------------------------- | --------- | -------------------------------- | -------------------------------------------------------------------- |
| `id`                       | UUID      | Unique identifier                | `c1d3e5f7-9012-3456-78cd-901234567890`                               |
| `refurbishment_request_id` | UUID      | Which refurbishment request      | Links to `refurbishment_requests.id`                                 |
| `course_id`                | UUID      | Which course                     | Links to `courses.id`                                                |
| `package_id`               | UUID      | Which package                    | Links to `refurbishment_packages.id`                                 |
| `quantity`                 | INT       | How many                         | `1`, `2`, etc.                                                       |
| `justification`            | TEXT      | Partner's explanation per course | `Current multimeters are faulty. Need replacements for 40 students.` |
| `created_at`               | TIMESTAMP | When partner selected            | `2024-03-05 15:00:00`                                                |
| `updated_at`               | TIMESTAMP | Last update                      | `2024-03-05 15:00:00`                                                |

**Example**:

- Partner sees admin pre-selected 3 packages for Electrical course
- Partner selects 2 of them (doesn't need the third)
- Partner writes justification: "Current equipment is 8 years old and not working properly"
- Partner uploads photos showing damaged equipment (stored in next table)

**Indexes**: refurbishment_request_id, course_id, package_id

**Relationships**:

- Links to `refurbishment_requests.id`, `courses.id`, `refurbishment_packages.id`

**Sample Data**:

```
ID: c1d3e5f7-9012-3456-78cd-901234567890
Refurbishment Request ID: v4w6x8y0-2345-6789-01vw-234567890123
Course ID: f8g0h2i4-6789-0123-45fg-678901234567 (Electrical & Electronics)
Package ID: w5x7y9z1-3456-7890-12wx-345678901234 (Multimeter Set)
Quantity: 1
Justification: Current multimeters are faulty and showing incorrect readings. Need replacements urgently for 40 students in current batch.
Created At: 2024-03-05 15:00:00
```

---

#### Table: `refurbishment_request_course_attachments`

**Purpose**: Stores photos that partner uploads per course showing the current condition of equipment/facilities that need refurbishment.

**Key Fields**:

| Field Name                 | Type         | Description       | Example                                                         |
| -------------------------- | ------------ | ----------------- | --------------------------------------------------------------- |
| `id`                       | UUID         | Unique identifier | `d2e4f6g8-0123-4567-89de-012345678901`                          |
| `refurbishment_request_id` | UUID         | Which request     | Links to `refurbishment_requests.id`                            |
| `course_id`                | UUID         | Which course      | Links to `courses.id`                                           |
| `file_url`                 | VARCHAR(500) | S3 URL of photo   | `s3://seif-refurbishment/request-123/electrical-lab-photo1.jpg` |
| `file_name`                | VARCHAR(255) | Original filename | `electrical_lab_damaged_multimeter.jpg`                         |
| `file_size_bytes`          | BIGINT       | File size         | `2458632` (2.4 MB)                                              |
| `file_mime_type`           | VARCHAR(100) | File type         | `image/jpeg`                                                    |
| `uploaded_by`              | UUID         | Who uploaded      | Links to `users.id`                                             |
| `created_at`               | TIMESTAMP    | Upload time       | `2024-03-05 15:05:00`                                           |

**Example**: Partner uploads 3 photos for Electrical course showing broken equipment, 2 photos for Solar course showing old panels.

**Indexes**: refurbishment_request_id, course_id

**Relationships**:

- Links to `refurbishment_requests.id`, `courses.id`, `users.id`

**Sample Data**:

```
ID: d2e4f6g8-0123-4567-89de-012345678901
Refurbishment Request ID: v4w6x8y0-2345-6789-01vw-234567890123
Course ID: f8g0h2i4-6789-0123-45fg-678901234567 (Electrical)
File URL: s3://seif-refurbishment/request-v4w6/elec-damaged-multimeter.jpg
File Name: electrical_lab_damaged_multimeter.jpg
File Size: 2458632 bytes
File Type: image/jpeg
Uploaded By: b4c6d8e0-2345-6789-01bc-def123456789 (partner user)
Created At: 2024-03-05 15:05:00
```

---

#### Table: `refurbishment_upgradation_rooms`

**Purpose**: If partner wants to upgrade a room (expand size, increase height, etc.), they provide room dimensions here. This is optional - not all refurbishment requests include upgradation.

**Key Fields**:

| Field Name                 | Type         | Description            | Example                                                                                      |
| -------------------------- | ------------ | ---------------------- | -------------------------------------------------------------------------------------------- |
| `id`                       | UUID         | Unique identifier      | `e3f5g7h9-1234-5678-90ef-123456789012`                                                       |
| `refurbishment_request_id` | UUID         | Which request          | Links to `refurbishment_requests.id`                                                         |
| `room_name`                | VARCHAR(255) | Room name              | `Electrical Lab Room 1`                                                                      |
| `length_meters`            | DECIMAL(6,2) | Length                 | `12.50` meters                                                                               |
| `breadth_meters`           | DECIMAL(6,2) | Width                  | `8.00` meters                                                                                |
| `height_meters`            | DECIMAL(6,2) | Height                 | `3.50` meters                                                                                |
| `justification`            | TEXT         | Why upgradation needed | `Current room is too small for 50 students. Need to expand to accommodate more workbenches.` |
| `created_at`               | TIMESTAMP    | Created                | `2024-03-05 15:10:00`                                                                        |
| `updated_at`               | TIMESTAMP    | Updated                | `2024-03-05 15:10:00`                                                                        |

**Note**: Currently, UI allows only ONE room per request, but schema supports multiple rooms for future extensibility.

**Indexes**: refurbishment_request_id

**Relationships**:

- Links to `refurbishment_requests.id`
- Referenced by `refurbishment_upgradation_photos`

**Sample Data**:

```
ID: e3f5g7h9-1234-5678-90ef-123456789012
Refurbishment Request ID: v4w6x8y0-2345-6789-01vw-234567890123
Room Name: Electrical Lab Room 1
Length: 12.50 meters
Breadth: 8.00 meters
Height: 3.50 meters
Justification: Current room is too small for 50 students. Need to expand by 4 meters to accommodate more workbenches and allow proper spacing between students for safety.
Created At: 2024-03-05 15:10:00
```

---

#### Table: `refurbishment_upgradation_photos`

**Purpose**: Photos of the room that partner wants to upgrade. Shows current condition and helps admin understand the upgradation need.

**Key Fields**:

| Field Name            | Type         | Description       | Example                                               |
| --------------------- | ------------ | ----------------- | ----------------------------------------------------- |
| `id`                  | UUID         | Unique identifier | `f4g6h8i0-2345-6789-01fg-234567890123`                |
| `upgradation_room_id` | UUID         | Which room        | Links to `refurbishment_upgradation_rooms.id`         |
| `file_url`            | VARCHAR(500) | S3 URL            | `s3://seif-refurbishment/request-123/room-photo1.jpg` |
| `file_name`           | VARCHAR(255) | Filename          | `electrical_lab_current_state.jpg`                    |
| `file_size_bytes`     | BIGINT       | File size         | `3125478`                                             |
| `file_mime_type`      | VARCHAR(100) | Type              | `image/jpeg`                                          |
| `uploaded_by`         | UUID         | Who uploaded      | Links to `users.id`                                   |
| `created_at`          | TIMESTAMP    | Upload time       | `2024-03-05 15:12:00`                                 |

**Indexes**: upgradation_room_id

**Relationships**:

- Links to `refurbishment_upgradation_rooms.id`, `users.id`

**Sample Data**:

```
ID: f4g6h8i0-2345-6789-01fg-234567890123
Upgradation Room ID: e3f5g7h9-1234-5678-90ef-123456789012
File URL: s3://seif-refurbishment/request-v4w6/room-current-crowded.jpg
File Name: electrical_lab_current_state_crowded.jpg
File Size: 3125478 bytes
File Type: image/jpeg
Uploaded By: b4c6d8e0-2345-6789-01bc-def123456789
Created At: 2024-03-05 15:12:00
```

---

### Category 8: Request Support

---

#### Table: `request_attachments`

**Purpose**: General file attachments for any request (not course-specific). Used for supporting documents, forms, certificates, etc.

**Key Fields**:

| Field Name        | Type         | Description       | Example                                       |
| ----------------- | ------------ | ----------------- | --------------------------------------------- |
| `id`              | UUID         | Unique identifier | `g5h7i9j1-3456-7890-12gh-345678901234`        |
| `request_id`      | UUID         | Which request     | Links to `requests.id`                        |
| `file_url`        | VARCHAR(500) | S3 URL            | `s3://seif-requests/request-123/document.pdf` |
| `file_name`       | VARCHAR(255) | Filename          | `center_assessment_report.pdf`                |
| `file_size_bytes` | BIGINT       | File size         | `1458920`                                     |
| `file_mime_type`  | VARCHAR(100) | Type              | `application/pdf`                             |
| `uploaded_by`     | UUID         | Who uploaded      | Links to `users.id`                           |
| `created_at`      | TIMESTAMP    | Upload time       | `2024-03-02 11:00:00`                         |

**Indexes**: request_id

**Sample Data**:

```
ID: g5h7i9j1-3456-7890-12gh-345678901234
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
File URL: s3://seif-requests/request-t2u4/assessment-report.pdf
File Name: center_infrastructure_assessment.pdf
File Size: 1458920 bytes
File Type: application/pdf
Uploaded By: a3b5c7d9-1234-5678-90ab-cdef12345678 (admin)
Created At: 2024-03-02 11:00:00
```

---

#### Table: `request_comments`

**Purpose**: Discussion thread on requests. Admins and partners can add comments. Some comments can be marked "internal" (only visible to admins).

**Key Fields**:

| Field Name    | Type      | Description                    | Example                                           |
| ------------- | --------- | ------------------------------ | ------------------------------------------------- |
| `id`          | UUID      | Unique identifier              | `h6i8j0k2-4567-8901-23hi-456789012345`            |
| `request_id`  | UUID      | Which request                  | Links to `requests.id`                            |
| `user_id`     | UUID      | Who commented                  | Links to `users.id`                               |
| `comment`     | TEXT      | Comment text                   | `Equipment looks very old. Approval recommended.` |
| `is_internal` | BOOLEAN   | Internal (admin-only) comment? | `true` or `false`                                 |
| `created_at`  | TIMESTAMP | Comment time                   | `2024-03-10 14:30:00`                             |
| `updated_at`  | TIMESTAMP | Edit time                      | `2024-03-10 14:30:00`                             |

**Indexes**: request_id, user_id

**Sample Data**:

```
ID: h6i8j0k2-4567-8901-23hi-456789012345
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
User ID: a3b5c7d9-1234-5678-90ab-cdef12345678 (admin)
Comment: Equipment looks very old based on photos. Approval recommended. Budget: â‚¹4.5 lakhs.
Is Internal: true (only admins can see)
Created At: 2024-03-10 14:30:00
```

```
ID: i7j9k1l3-5678-9012-34ij-567890123456
Request ID: t2u4v6w8-0123-4567-89tu-012345678901
User ID: b4c6d8e0-2345-6789-01bc-def123456789 (partner)
Comment: Thank you for approving. When can we expect delivery?
Is Internal: false (visible to both)
Created At: 2024-03-16 10:00:00
```

---

### Category 9: Notifications

---

#### Table: `notifications`

**Purpose**: Stores all in-app notifications and alerts. When something important happens (upload approved, request status changed), a notification is created here and shown in user's inbox.

**Key Fields**:

| Field Name            | Type         | Description                         | Example                                                           |
| --------------------- | ------------ | ----------------------------------- | ----------------------------------------------------------------- |
| `id`                  | UUID         | Unique identifier                   | `j8k0l2m4-6789-0123-45jk-678901234567`                            |
| `recipient_id`        | UUID         | Who should see this (specific user) | Links to `users.id` (NULL if broadcast to role)                   |
| `recipient_role`      | VARCHAR(50)  | Broadcast to all users of this role | `ADMIN`, `PARTNER`, NULL (if specific user)                       |
| `type`                | VARCHAR(50)  | Notification category               | `upload`, `approval`, `rejection`, `request`, `alert`             |
| `alert_type`          | VARCHAR(50)  | Used in Alerts tab                  | `refurbishment`, `data_approval`, `data_reject`, `upload_request` |
| `title`               | VARCHAR(255) | Notification title                  | `Upload Approved`                                                 |
| `message`             | TEXT         | Main message                        | `Your upload for Pune Center has been approved by admin.`         |
| `remark`              | TEXT         | Admin's additional remarks          | `All data looks good. Added to main database.`                    |
| `payload`             | JSON         | Extra structured data               | `{"upload_id": "p8q0r2s4-...", "center_name": "Pune Center 1"}`   |
| `related_entity_type` | VARCHAR(50)  | What this notification is about     | `request`, `partner`, `center`, `data_upload`                     |
| `related_entity_id`   | UUID         | ID of related entity                | Links to respective table                                         |
| `is_read`             | BOOLEAN      | Has user read it?                   | `true` or `false`                                                 |
| `read_at`             | TIMESTAMP    | When read                           | `2024-03-15 16:00:00` or NULL                                     |
| `sent_via`            | VARCHAR(20)  | Delivery method                     | `in_app` (only method used currently)                             |
| `email_sent_at`       | TIMESTAMP    | Email sent time                     | NULL (emails not sent currently)                                  |
| `created_at`          | TIMESTAMP    | Notification created                | `2024-03-15 14:30:00`                                             |

**Partner Inbox - Alerts Tab**: Shows notifications with these columns:

- Date (created_at)
- Type (alert_type)
- Title
- Remark
- Status (from related request)
- Action (View button)

**Indexes**: recipient_id, recipient_role, is_read, type, alert_type, created_at

**Sample Data**:

```
ID: j8k0l2m4-6789-0123-45jk-678901234567
Recipient ID: b4c6d8e0-2345-6789-01bc-def123456789 (partner user)
Recipient Role: NULL
Type: approval
Alert Type: data_approval
Title: Upload Approved
Message: Your upload for Pune Center Batch Jan 2024 has been approved.
Remark: All data looks good. Added to main database.
Payload: {"upload_id": "p8q0r2s4-6789-0123-45pq-678901234567", "center_name": "Pune Center 1"}
Related Entity Type: data_upload
Related Entity ID: p8q0r2s4-6789-0123-45pq-678901234567
Is Read: true
Read At: 2024-03-15 16:00:00
Sent Via: in_app
Created At: 2024-03-15 14:30:00
```

```
ID: k9l1m3n5-7890-1234-56kl-789012345678
Recipient ID: b4c6d8e0-2345-6789-01bc-def123456789
Recipient Role: NULL
Type: alert
Alert Type: refurbishment
Title: Refurbishment Request Created
Message: A refurbishment request has been created for your center.
Remark: Please review and select required packages course-wise.
Related Entity Type: request
Related Entity ID: t2u4v6w8-0123-4567-89tu-012345678901
Is Read: false
Read At: NULL
Sent Via: in_app
Created At: 2024-03-01 09:45:00
```

---

### Category 10: Reporting & Audit

---

#### Table: `download_logs`

**Purpose**: Tracks all report downloads by SEIF users (ESSCI role). Helps audit who downloaded what data and when.

**Key Fields**:

| Field Name      | Type         | Description            | Example                                                      |
| --------------- | ------------ | ---------------------- | ------------------------------------------------------------ |
| `id`            | UUID         | Unique identifier      | `l0m2n4o6-8901-2345-67lm-890123456789`                       |
| `user_id`       | UUID         | Who downloaded         | Links to `users.id`                                          |
| `download_type` | VARCHAR(50)  | Type of report         | `center_wise`, `partner_wise`, `batch_wise`                  |
| `partner_id`    | UUID         | If filtered by partner | Links to `partners.id`                                       |
| `center_id`     | UUID         | If filtered by center  | Links to `centers.id`                                        |
| `file_name`     | VARCHAR(255) | Downloaded filename    | `centers_maharashtra_report_2024-11-05.xlsx`                 |
| `record_count`  | INT          | How many records       | `150`                                                        |
| `filters`       | JSON         | Applied filters        | `{"state": "Maharashtra", "year": 2024, "status": "active"}` |
| `created_at`    | TIMESTAMP    | Download time          | `2024-11-05 10:30:00`                                        |

**Indexes**: user_id, download_type, partner_id, center_id, created_at

**Sample Data**:

```
ID: l0m2n4o6-8901-2345-67lm-890123456789
User ID: m1n3o5p7-9012-3456-78mn-901234567890 (ESSCI user)
Download Type: center_wise
Partner ID: NULL (all partners)
Center ID: NULL (all centers)
File Name: all_centers_maharashtra_2024-11-05.xlsx
Record Count: 150
Filters: {"state": "Maharashtra", "status": "active", "region": "West"}
Created At: 2024-11-05 10:30:00
```

---

#### Table: `audit_logs`

**Purpose**: Complete activity trail. Every important action (login, create, update, delete, approve, reject) is logged here with details of what changed.

**Key Fields**:

| Field Name    | Type         | Description                 | Example                                                                                    |
| ------------- | ------------ | --------------------------- | ------------------------------------------------------------------------------------------ |
| `id`          | UUID         | Unique identifier           | `n2o4p6q8-0123-4567-89no-012345678901`                                                     |
| `user_id`     | UUID         | Who did it                  | Links to `users.id`                                                                        |
| `action`      | VARCHAR(100) | What action                 | `login`, `logout`, `create`, `update`, `delete`, `approve`, `reject`, `upload`, `download` |
| `entity_type` | VARCHAR(50)  | What was affected           | `user`, `partner`, `center`, `batch`, `request`, `data_upload`                             |
| `entity_id`   | UUID         | Which record                | ID from respective table                                                                   |
| `changes`     | JSON         | What changed (before/after) | `{"status": {"old": "pending", "new": "approved"}}`                                        |
| `ip_address`  | VARCHAR(45)  | User's IP                   | `103.255.123.45`                                                                           |
| `user_agent`  | TEXT         | Browser info                | `Mozilla/5.0 (Windows NT 10.0; Win64; x64)...`                                             |
| `created_at`  | TIMESTAMP    | When                        | `2024-03-15 14:30:00`                                                                      |

**Indexes**: user_id, entity_type, entity_id, action, created_at

**Sample Data**:

```
ID: n2o4p6q8-0123-4567-89no-012345678901
User ID: a3b5c7d9-1234-5678-90ab-cdef12345678 (admin)
Action: approve
Entity Type: data_upload
Entity ID: p8q0r2s4-6789-0123-45pq-678901234567
Changes: {
  "status": {"old": "pending", "new": "approved"},
  "reviewed_by": {"old": null, "new": "a3b5c7d9-1234-5678-90ab-cdef12345678"},
  "reviewed_at": {"old": null, "new": "2024-03-15 14:30:00"}
}
IP Address: 103.255.123.45
User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0
Created At: 2024-03-15 14:30:00
```

---

## Data Flow Diagrams

These diagrams explain how data moves through the system in simple steps.

---

### Flow 1: Partner Uploads Center Data

**Description**: Partner uploads a CSV file containing center, batch, and student information. The data goes into staging tables for admin review.

**Step-by-Step Flow**:

```
Step 1: Partner Login
   â†’ Partner user logs into the portal using email and password
   â†’ System checks `users` table for credentials
   â†’ If valid, create session and show partner dashboard

Step 2: Partner Prepares CSV File
   â†’ Partner may include data for MULTIPLE centers in a single CSV file
   â†’ CSV must include two columns for center identification: `center_name` and `center_id` (partner-provided identifier)
   â†’ CSV contains: Center details (name, address, etc.) + Batch details (batch number, dates, student counts) + All student records (one row per student)
   â†’ File saved on partner's computer

Step 3: Partner Uploads File
   â†’ Partner goes to "Upload Data" page
   â†’ Fills form: center name, batch number, dates, student counts
   â†’ Attaches CSV file
   â†’ Clicks "Upload" button

Step 4: Frontend Validates File
   â†’ Check file type (must be CSV)
   â†’ Check file size (not too large)
   â†’ Show preview of first few rows
   â†’ If validation passes, upload to S3

Step 5: File Uploaded to S3
   â†’ CSV file uploaded to AWS S3 bucket
   â†’ Generates unique file URL: s3://seif-uploads/partner-123/upload-456.csv
   â†’ File stored securely

Step 6: Create Upload Record
   â†’ INSERT into `data_uploads` table
   â†’ Fields: partner_id, upload_type='center', file_url, file_name, status='pending', uploaded_by (user ID)
   â†’ Get upload ID (e.g., p8q0r2s4-6789-0123-45pq-678901234567)

Step 7: Trigger Background Job
   â†’ Background worker picks up the new upload
   â†’ Downloads CSV from S3
   â†’ Parses CSV line by line

Step 8: Parse and Store in Staging Tables
   â†’ Background worker parses CSV line by line and reads the `center_id` value on each row
   â†’ Group rows by `center_id` (csv_center_id). For each distinct `center_id` found in this upload:
      • ALWAYS INSERT one row into `uploaded_centers` for this upload (data_upload_id, partner_id, csv_center_id, center_name, address, approval_status='pending'). Do NOT auto-link to existing `centers` records even if the partner-supplied `center_id` looks identical to an existing center.
      • For each batch row belonging to that `center_id`, INSERT into `uploaded_batches` with `csv_center_id` and link to the newly created `uploaded_center` via `uploaded_center_id` after creation
      • For each student row, INSERT into `uploaded_students` with `csv_center_id` and link to the appropriate `uploaded_batch_id` and `uploaded_center_id` (when determinable)
   â†’ Update `data_uploads`.total_records with count

Step 9: Create Notification for Admin
   â†’ INSERT into `notifications` table
   â†’ Fields: recipient_role='ADMIN', type='upload', title='New Upload Pending Review', message='Partner [name] uploaded data for [center]', related_entity_type='data_upload', related_entity_id=[upload ID]
   â†’ Send real-time notification to all admins currently logged in

Step 10: Partner Sees Confirmation
   â†’ UI shows "Upload successful! Your data is pending admin review."
   â†’ Partner can see upload status in their dashboard: "Pending Review"
```

**Tables Involved**:

- `users` (authentication)
- `partners` (which partner uploaded)
- `data_uploads` (upload metadata)
- `uploaded_centers` (center pending approval)
- `uploaded_batches` (batch pending approval)
- `uploaded_students` (students pending approval)
- `notifications` (alert admin)
- `audit_logs` (log the upload action)

---

### Flow 2: Admin Reviews and Approves Upload

**Description**: Admin reviews the uploaded data and either approves everything or rejects everything with detailed reasons.

**Step-by-Step Flow**:

```
Step 1: Admin Sees Notification
   â†’ Admin logs in
   â†’ Sees notification: "New Upload Pending Review"
   â†’ Clicks on notification â†’ Goes to Upload Review page

Step 2: Admin Views Upload Details
   â†’ System queries:
     - SELECT * FROM data_uploads WHERE id = [upload_id]
     - SELECT * FROM uploaded_centers WHERE data_upload_id = [upload_id]
     - SELECT * FROM uploaded_batches WHERE data_upload_id = [upload_id]
     - SELECT * FROM uploaded_students WHERE data_upload_id = [upload_id]
   â†’ Admin sees:
     - Upload metadata (file name, upload date, partner name)
     - Center details
     - Batch details
     - List of all students (paginated table)

Step 3: Admin Reviews Data
   â†’ Admin checks if:
     - Center name is correct and properly formatted
     - Batch dates are valid
     - Student IDs follow correct format
     - All required fields are filled
     - No duplicate student IDs

Step 4A: Admin Approves (If data is good)
   â†’ Admin clicks "Approve" button
   â†’ System starts database transaction:

   Sub-step 4A.1: Create Center
     â†’ INSERT into `centers` table (SELECT columns FROM uploaded_centers WHERE data_upload_id = [upload_id])
     â†’ Get new center ID: new_center_id
     â†’ UPDATE uploaded_centers SET approval_status='approved', approved_center_id = new_center_id WHERE data_upload_id = [upload_id]

   Sub-step 4A.2: Create Batch
     â†’ INSERT into `batches` table (SELECT columns FROM uploaded_batches WHERE data_upload_id = [upload_id])
     â†’ Link to approved center_id
     â†’ Get new batch ID: new_batch_id
     â†’ UPDATE uploaded_batches SET approval_status='approved', approved_batch_id = new_batch_id WHERE data_upload_id = [upload_id]

   Sub-step 4A.3: Create Students (Future)
     â†’ For each row in uploaded_students:
       â†’ INSERT into future `students` table
       â†’ Get new student ID
       â†’ UPDATE uploaded_students SET approval_status='approved', approved_student_id = new_student_id

   Sub-step 4A.4: Update Upload Status
     â†’ UPDATE data_uploads SET status='approved', reviewed_by=[admin_user_id], reviewed_at=NOW() WHERE id = [upload_id]

   Sub-step 4A.5: Create Approval Notification
     â†’ INSERT into notifications (recipient_id = [partner_user_id], type='approval', alert_type='data_approval', title='Upload Approved', message='Your upload has been approved', remark=[admin comments if any])

   Sub-step 4A.6: Log Audit Trail
     â†’ INSERT into audit_logs (user_id=[admin_id], action='approve', entity_type='data_upload', entity_id=[upload_id], changes='{"status": {"old": "pending", "new": "approved"}}')

   â†’ Commit transaction
   â†’ Show success message to admin

Step 4B: Admin Rejects (If data has issues)
   â†’ Admin clicks "Reject" button
   â†’ Modal appears asking for:
     - Rejection Reason (dropdown): "Invalid student IDs", "Incomplete data", "Wrong format", etc.
     - Remarks (text area): Detailed explanation of what needs to be fixed
   â†’ Admin fills and submits
   â†’ System updates:
     â†’ UPDATE data_uploads SET status='rejected', rejection_reason=[reason], remarks=[remarks], reviewed_by=[admin_user_id], reviewed_at=NOW() WHERE id = [upload_id]
     â†’ UPDATE uploaded_centers SET approval_status='rejected', rejection_reason=[reason], remarks=[remarks] WHERE data_upload_id = [upload_id]
     â†’ UPDATE uploaded_batches SET approval_status='rejected', rejection_reason=[reason], remarks=[remarks] WHERE data_upload_id = [upload_id]
     â†’ UPDATE uploaded_students SET approval_status='rejected', rejection_reason=[reason], remarks=[remarks] WHERE data_upload_id = [upload_id]
     â†’ INSERT into notifications (recipient_id = [partner_user_id], type='rejection', alert_type='data_reject', title='Upload Rejected', message='Your upload was rejected', remark=[rejection_reason + remarks])
     â†’ INSERT into audit_logs (action='reject', entity_type='data_upload', changes JSON with reason)
   â†’ Show success message to admin

Step 5: Partner Sees Result
   â†’ Partner logs in â†’ Sees notification
   â†’ If Approved: "Your upload has been approved! Data is now in the main database."
   â†’ If Rejected: "Your upload was rejected. Reason: [rejection_reason]. Remarks: [detailed remarks]. Please fix and re-upload."

Step 6: Partner Re-uploads (If rejected)
   â†’ Partner fixes the CSV file based on admin's remarks
   â†’ Partner goes to the same upload record
   â†’ Uploads corrected CSV file
   â†’ Status changes from 'rejected' to 'pending'
   â†’ Admin reviews again
```

**Tables Involved**:

- `data_uploads`
- `uploaded_centers`, `uploaded_batches`, `uploaded_students` (staging)
- `centers`, `batches` (approved data)
- `notifications`
- `audit_logs`

---

### Flow 3: Admin Creates Scheduled Upload Request

**Description**: Admin schedules recurring requests asking partner to upload data monthly, quarterly, or annually.

**Step-by-Step Flow**:

```
Step 1: Admin Opens Request Form
   â†’ Admin goes to "Request Upload" page
   â†’ Sees form with fields:
     - Select Partner (dropdown)
     - Select Center (dropdown - optional, can request for all centers)
     - Reason for Request (text)
     - Description (text area)
     - Attach File (optional - e.g., template CSV)
     - Schedule Type (dropdown):
       â€¢ Immediate (send now)
       â€¢ Monthly (every month)
       â€¢ Quarterly (every 3 months)
       â€¢ Semi-Annual (every 6 months)
       â€¢ Annual (every year)
       â€¢ Custom (select date range: from-to)
     - Start Date (if recurring)
     - End Date (if recurring, optional)

Step 2: Admin Fills and Submits
   â†’ Admin selects:
     - Partner: "Tech Skills Training Pvt Ltd"
     - Center: "Pune Center 1"
     - Reason: "Monthly Data Update Required"
     - Description: "Please upload updated batch and student data for November 2024"
     - Schedule: "Monthly"
     - Start Date: "2024-11-01"
     - End Date: "2025-10-31" (1 year)
   â†’ Clicks "Create Request"

Step 3: Create Request Record
   â†’ System generates unique request number: "REQ-2024-00456"
   â†’ INSERT into `requests` table:
     - request_number='REQ-2024-00456'
     - type='upload_request'
     - partner_id=[selected partner]
     - center_id=[selected center or NULL]
     - title='Monthly Data Update Required'
     - description=[description text]
     - status='pending'
     - created_by=[admin user ID]
   â†’ Get request_id: req_123

Step 4: Create Scheduled Request Entry
   â†’ INSERT into `scheduled_requests` table:
     - request_id = req_123
     - recurrence_type = 'monthly'
     - start_date = '2024-11-01'
     - end_date = '2025-10-31'
     - next_scheduled_date = '2024-11-01' (first execution date)
     - is_active = true

Step 5: Create Immediate Notification (If recurrence=immediate OR first execution)
   â†’ INSERT into `notifications` table:
     - recipient_id = [partner user ID]
     - type = 'request'
     - alert_type = 'upload_request'
     - title = 'Upload Request from Admin'
     - message = 'Admin has requested you to upload data for [center name]'
     - remark = [admin's description]
     - related_entity_type = 'request'
     - related_entity_id = req_123
   â†’ Send real-time notification if partner online

Step 6: Background Scheduler (Daily Job)
   â†’ Every day at 9:00 AM, background job runs:
   â†’ Query: SELECT * FROM scheduled_requests WHERE is_active = true AND next_scheduled_date <= CURDATE()
   â†’ For each due request:
     - Create notification to partner (same as Step 5)
     - Update scheduled_requests:
       â€¢ last_executed_at = NOW()
       â€¢ next_scheduled_date = [calculate next date based on recurrence_type]
         - If monthly: next_scheduled_date = next_scheduled_date + 1 MONTH
         - If quarterly: next_scheduled_date = next_scheduled_date + 3 MONTHS
         - etc.
     - Check if next_scheduled_date > end_date:
       â€¢ If yes: UPDATE is_active = false (schedule completed)

Step 7: Partner Sees Request
   â†’ Partner logs in â†’ Inbox shows "Upload Request from Admin"
   â†’ Partner clicks View â†’ Sees request details
   â†’ Partner uploads data following the normal upload flow (Flow 1)
```

**Tables Involved**:

- `requests`
- `scheduled_requests`
- `notifications`
- `partners`, `centers`
- `audit_logs`

---

### Flow 4: Refurbishment Request (Complete Course-Based Flow)

**Description**: Admin creates refurbishment request for an eligible center. Partner selects packages course-by-course with photos. Admin reviews and approves.

**Step-by-Step Flow**:

```
Step 1: Background Job Checks Eligibility (Daily at Midnight)
   â†’ Job runs: SELECT * FROM centers WHERE status='active'
   â†’ For each center, calculate:
     - months_since = TIMESTAMPDIFF(MONTH, COALESCE(last_refurbishment_date, year_of_establishment), CURDATE())
     - is_eligible = (months_since >= refurbishment_frequency_months)
   â†’ If is_eligible = true:
     - UPDATE centers SET refurbishment_eligible = true
     - Check if notification already sent recently (to avoid spam)
     - If not, INSERT into notifications (recipient_role='ADMIN', alert_type='refurbishment', message='Center [name] is now eligible for refurbishment')

Step 2: Admin Views Eligible Centers
   â†’ Admin goes to "Refurbishment" page â†’ "Overview" tab â†’ "Eligible Centers" sub-tab
   â†’ System shows list of centers WHERE refurbishment_eligible = true
   â†’ Shows: Center name, Partner, Last refurbishment date, Frequency, Months since last, Courses offered

Step 3: Admin Creates Refurbishment Request
   â†’ Admin clicks "Create Refurbishment Request" button
   â†’ Modal opens with form:
     - Select Center (dropdown filtered to eligible centers)
     - Select Courses (multi-select showing center's courses from `center_courses` table)
     - For each selected course, admin sees available packages (from `course_packages` table)
     - Admin pre-selects packages per course by checking boxes
     - Add Remarks/Instructions for partner (text area)
   â†’ Admin fills:
     - Center: "Pune Center 1"
     - Courses: "Electrical", "Solar"
     - For Electrical: Selects "Multimeter Set", "Oscilloscope", "Lab Benches"
     - For Solar: Selects "Solar Panel Kit", "Inverter System"
     - Remarks: "Please review and select needed items with justification"
   â†’ Clicks "Create Request"

Step 4: System Creates Request
   â†’ Generate request_number: "REQ-2024-00789"
   â†’ INSERT into `requests` (request_number, type='refurbishment', partner_id, center_id, title='Refurbishment Request', status='pending', created_by=admin_id)
   â†’ Get request_id: req_789
   â†’ INSERT into `refurbishment_requests` (request_id=req_789, center_id, refurbishment_type='refurbishment')
   â†’ Get refurb_request_id: refurb_456
   â†’ For each course and each admin-selected package:
     - INSERT into `refurbishment_admin_selected_packages` (request_id=req_789, course_id, package_id)
       Example rows:
       - (req_789, electrical_course_id, multimeter_package_id)
       - (req_789, electrical_course_id, oscilloscope_package_id)
       - (req_789, electrical_course_id, lab_benches_package_id)
       - (req_789, solar_course_id, solar_panel_package_id)
       - (req_789, solar_course_id, inverter_package_id)
   â†’ INSERT into `notifications` (recipient_id=partner_user, alert_type='refurbishment', title='Refurbishment Request Created', remark=admin_remarks, related_entity_id=req_789)
   â†’ INSERT into `audit_logs`

Step 5: Partner Sees Alert
   â†’ Partner logs in â†’ Goes to Inbox â†’ "Alerts" tab
   â†’ Sees table row:
     - Date: 2024-11-05
     - Type: Refurbishment
     - Title: Refurbishment Request Created
     - Remark: Please review and select needed items with justification
     - Status: pending
     - Action: [View] button
   â†’ Partner clicks "View"

Step 6: Partner Views Request Details
   â†’ System queries:
     - Request details from `requests` and `refurbishment_requests`
     - Center details from `centers`
     - Courses from `center_courses`
     - Admin-selected packages from `refurbishment_admin_selected_packages` grouped by course
   â†’ UI shows:
     - Center name, address
     - Admin remarks
     - Course tabs: [Electrical] [Solar] [Industrial Automation] etc.

Step 7: Partner Selects Packages Course-by-Course
   â†’ Partner clicks "Electrical" tab
   â†’ Sees admin pre-selected packages:
     â˜ Multimeter Set (10 units)
     â˜ Oscilloscope (5 units)
     â˜ Lab Benches (20 units)
   â†’ Partner checks boxes for needed items:
     â˜‘ Multimeter Set
     â˜ Oscilloscope (doesn't need this)
     â˜‘ Lab Benches
   â†’ Partner fills "Justification" text area: "Current multimeters are 8 years old and showing incorrect readings. Benches are damaged and unsafe."
   â†’ Partner uploads photos: [Upload button]
     - electrical_multimeter_damaged.jpg (shows broken meters)
     - electrical_benches_broken.jpg (shows damaged benches)

   â†’ Partner clicks "Solar" tab
   â†’ Sees packages:
     â˜ Solar Panel Kit
     â˜ Inverter System
   â†’ Partner checks:
     â˜‘ Solar Panel Kit
     â˜‘ Inverter System
   â†’ Justification: "Current panels are old generation with low efficiency. Inverter frequently fails."
   â†’ Uploads photos: solar_old_panels.jpg, solar_faulty_inverter.jpg

Step 8: Partner Optionally Requests Upgradation
   â†’ Bottom of page shows: â˜ Request Room Upgradation (checkbox)
   â†’ Partner checks it â†’ Form expands:
     - Room Name: "Electrical Lab Room 1"
     - Length (meters): 12.5
     - Breadth (meters): 8.0
     - Height (meters): 3.5
     - Justification: "Room is too small for 50 students. Need expansion."
     - Upload Photos: [Upload button]
       - room_crowded.jpg (shows cramped space)
       - room_exterior.jpg (shows room dimensions)

Step 9: Partner Reviews in Preview Screen
   â†’ Partner clicks "Preview" button
   â†’ Sees summary in tabs:
     - [Electrical] tab: Shows 2 selected packages (Multimeter, Benches), justification, 2 photos
     - [Solar] tab: Shows 2 selected packages (Panels, Inverter), justification, 2 photos
     - [Upgradation] tab: Shows room details, dimensions, justification, 2 photos
   â†’ Partner reviews everything â†’ Clicks "Submit"

Step 10: System Saves Partner Selections
   â†’ UPDATE requests SET status='partner_submitted'
   â†’ For Electrical course:
     - INSERT into `refurbishment_request_course_packages` (refurb_request_id=refurb_456, course_id=electrical_id, package_id=multimeter_id, quantity=1, justification="Current multimeters are 8 years old...")
     - INSERT into `refurbishment_request_course_packages` (refurb_request_id=refurb_456, course_id=electrical_id, package_id=benches_id, quantity=1, justification="...")
     - Upload photos to S3 â†’ Get URLs
     - INSERT into `refurbishment_request_course_attachments` (refurb_request_id, course_id=electrical_id, file_url, file_name, uploaded_by)
       - One row per photo
   â†’ For Solar course:
     - Same process - INSERT into course_packages and attachments tables
   â†’ For Upgradation:
     - UPDATE refurbishment_requests SET is_upgradation_requested = true (this field tracks if upgradation was requested)
     - INSERT into `refurbishment_upgradation_rooms` (refurb_request_id, room_name, length_meters, breadth_meters, height_meters, justification)
     - Get room_id
     - Upload room photos to S3
     - INSERT into `refurbishment_upgradation_photos` (upgradation_room_id=room_id, file_url, file_name, uploaded_by)
   â†’ INSERT into `notifications` (recipient_role='ADMIN', alert_type='refurbishment', title='Partner Submitted Refurbishment Request', related_entity_id=req_789)
   â†’ Partner sees success message

Step 11: Admin Reviews Submission
   â†’ Admin logs in â†’ Sees notification
   â†’ Admin goes to Refurbishment page â†’ "Requests" tab
   â†’ Sees request with status='partner_submitted'
   â†’ Admin clicks "Review" â†’ status changes to 'in_review'
   â†’ UI shows:
     - Center and partner details
     - Course tabs (same as partner view)
     - For each course:
       - Table of selected packages with partner justification
       - Photo gallery showing all uploaded photos for this course
     - Upgradation tab (if requested):
       - Room details with dimensions
       - Partner justification
       - Room photos

Step 12: Admin Approves or Rejects
   â†’ If Admin Approves:
     - Admin clicks "Approve" button
     - Modal asks for "Admin Remarks" (optional congratulatory message or next steps)
     - Admin writes: "Approved. Equipment will be delivered in 3 weeks."
     - System updates:
       - UPDATE requests SET status='approved', reviewed_by=admin_id, reviewed_at=NOW()
       - UPDATE centers SET last_refurbishment_date = CURDATE(), refurbishment_eligible = false WHERE id = center_id
       - INSERT into notifications (recipient_id=partner_user, alert_type='refurbishment', title='Refurbishment Approved', message='Your refurbishment request has been approved', remark=admin_remarks)
       - INSERT into audit_logs (action='refurbishment_approved')

   â†’ If Admin Rejects:
     - Admin clicks "Reject" button
     - Modal requires:
       - Rejection Reason (required): "Budget constraints", "Insufficient justification", "Wrong items selected", etc.
       - Remarks (required): Detailed explanation
     - Admin writes: "Oscilloscope is actually needed based on curriculum requirements. Please re-submit with all necessary items."
     - System updates:
       - UPDATE requests SET status='rejected', rejection_reason=[reason], remarks=[admin_remarks], reviewed_by=admin_id, reviewed_at=NOW()
       - INSERT into notifications (recipient_id=partner_user, alert_type='refurbishment', title='Refurbishment Rejected', message='Your refurbishment request was rejected', remark=[reason + remarks])
       - INSERT into audit_logs (action='refurbishment_rejected')

   â†’ Partner sees result in inbox

Step 13: Partner Re-submits (If rejected)
   â†’ Partner sees rejection notification with detailed reason
   â†’ Partner clicks "View" â†’ Goes back to refurbishment form
   â†’ Form is pre-filled with previous selections
   â†’ Partner can modify selections (e.g., add Oscilloscope back)
   â†’ Partner updates justification and photos
   â†’ Partner re-submits
   â†’ status changes from 'rejected' to 'partner_submitted'
   â†’ Admin reviews again
```

**Tables Involved**:

- `centers` (eligibility calculation)
- `requests` (master request)
- `refurbishment_requests` (refurb details)
- `courses`, `center_courses`, `course_packages` (which packages for which courses)
- `refurbishment_packages` (available items)
- `refurbishment_admin_selected_packages` (admin pre-selection)
- `refurbishment_request_course_packages` (partner final selections per course)
- `refurbishment_request_course_attachments` (photos per course)
- `refurbishment_upgradation_rooms` (room dimensions)
- `refurbishment_upgradation_photos` (room photos)
- `notifications`
- `audit_logs`

---

## Process Flowcharts

These charts explain business processes with decision points.

---

### Chart 1: Request Status Flow

**Description**: Shows all possible status transitions for any type of request.

```
[START]
   â†“
Admin Creates Request
   â†“
[Status: PENDING] â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â†“                                â”‚
Partner Views Request               â”‚
   â†“                                â”‚
Decision: Does partner take action? â”‚
   â”œâ”€ NO â†’ Stays in PENDING â”€â”€â”€â”€â”€â”€â”€â”€â”˜ (Can wait indefinitely)
   â†“
   YES
   â†“
[Status: IN_PROGRESS]
   â†“
Partner Submits Response
   â†“
[Status: PARTNER_SUBMITTED]
   â†“
Admin Reviews
   â†“
[Status: IN_REVIEW]
   â†“
Decision: Admin Approves or Rejects?
   â”œâ”€ APPROVE â†’ [Status: APPROVED] â†’ [END]
   â”‚             â†“
   â”‚          UPDATE center.last_refurbishment_date (if refurb request)
   â”‚             â†“
   â”‚          SEND notification to partner
   â”‚             â†“
   â”‚          [COMPLETED]
   â”‚
   â””â”€ REJECT â†’ [Status: REJECTED]
                 â†“
              SEND notification with reason
                 â†“
              Decision: Can partner re-submit?
                 â”œâ”€ YES â†’ Partner modifies â†’ [Status: PARTNER_SUBMITTED] â”€â”
                 â”‚                                                         â”‚
                 â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                         (Loop back to review)
                 â†“
                 NO (request abandoned)
                 â†“
              [END - Request archived]
```

**Key Decision Points**:

1. **Partner Action**: Partner can delay indefinitely
2. **Admin Review**: Binary decision (Approve/Reject)
3. **Re-submission**: Partner can revise and re-submit after rejection

---

### Chart 2: Upload Approval Process

**Description**: Detailed flow for data upload review with validation steps.

```
[START] Partner Uploads CSV
   â†“
Frontend Validation
   â”œâ”€ File type check (must be .csv)
   â”œâ”€ File size check (max 10 MB)
   â””â”€ Preview first 5 rows
   â†“
Decision: Frontend validation passed?
   â”œâ”€ NO â†’ Show error â†’ Partner fixes file â†’ [Loop back to START]
   â†“
   YES
   â†“
Upload to S3
   â†“
Create data_uploads record (status='pending')
   â†“
Background Job: Parse CSV
   â†“
For each row:
   â”œâ”€ Parse center data â†’ INSERT into uploaded_centers
   â”œâ”€ Parse batch data â†’ INSERT into uploaded_batches
   â””â”€ Parse student data â†’ INSERT into uploaded_students
   â†“
Decision: Parsing successful?
   â”œâ”€ NO â†’ UPDATE data_uploads.status='failed' â†’ SEND error notification â†’ [END]
   â†“
   YES
   â†“
UPDATE data_uploads.total_records
   â†“
SEND notification to all admins
   â†“
[Status: PENDING REVIEW]
   â†“
Admin Views Upload (Queues can be large, might wait days)
   â†“
Admin Clicks "Review"
   â†“
Admin Sees:
   â”œâ”€ Center details
   â”œâ”€ Batch details
   â””â”€ All students (paginated table)
   â†“
Admin Manually Checks:
   â”œâ”€ Center name format correct?
   â”œâ”€ Batch dates valid and logical?
   â”œâ”€ Student IDs follow pattern (SEIF-[state]-[5 digits])?
   â”œâ”€ All required fields filled?
   â”œâ”€ Any duplicate student IDs?
   â””â”€ Data matches partner's approved center list?
   â†“
Decision: Data quality OK?
   â”‚
   â”œâ”€ YES (APPROVE PATH)
   â”‚   â†“
   â”‚   Start Transaction
   â”‚   â†“
   â”‚   INSERT into centers (FROM uploaded_centers)
   â”‚   â†“
   â”‚   Get new center_id
   â”‚   â†“
   â”‚   UPDATE uploaded_centers.approved_center_id = center_id
   â”‚   â†“
   â”‚   INSERT into batches (FROM uploaded_batches)
   â”‚   â†“
   â”‚   Get new batch_id
   â”‚   â†“
   â”‚   UPDATE uploaded_batches.approved_batch_id = batch_id
   â”‚   â†“
   â”‚   For each uploaded_student:
   â”‚      INSERT into students table (FUTURE)
   â”‚      UPDATE uploaded_students.approval_status='approved'
   â”‚   â†“
   â”‚   UPDATE data_uploads.status='approved', reviewed_by=admin_id, reviewed_at=NOW()
   â”‚   â†“
   â”‚   INSERT into audit_logs (action='data_approved')
   â”‚   â†“
   â”‚   Commit Transaction
   â”‚   â†“
   â”‚   SEND notification to partner: "Your upload has been approved!"
   â”‚   â†“
   â”‚   [END - SUCCESS]
   â”‚
   â””â”€ NO (REJECT PATH)
       â†“
       Admin fills rejection form:
          â”œâ”€ Rejection Reason (dropdown)
          â””â”€ Detailed Remarks (text)
       â†“
       UPDATE data_uploads.status='rejected', rejection_reason, remarks, reviewed_by, reviewed_at
       â†“
       UPDATE uploaded_centers.approval_status='rejected', rejection_reason, remarks
       â†“
       UPDATE uploaded_batches.approval_status='rejected', rejection_reason, remarks
       â†“
       UPDATE uploaded_students.approval_status='rejected', rejection_reason, remarks
       â†“
       INSERT into audit_logs (action='data_rejected', changes JSON)
       â†“
       SEND notification to partner with detailed rejection reason
       â†“
       Partner sees: "Upload rejected. Reason: [reason]. Remarks: [detailed explanation]"
       â†“
       Decision: Partner wants to fix and re-upload?
          â”œâ”€ YES â†’ Partner downloads rejected CSV
          â”‚        â†“
          â”‚        Partner fixes issues based on remarks
          â”‚        â†“
          â”‚        Partner uploads corrected file
          â”‚        â†“
          â”‚        [Loop back to START - Frontend Validation]
          â”‚
          â””â”€ NO â†’ Request abandoned â†’ [END]
```

**Important Notes**:

- **All-or-Nothing**: Entire upload approved or rejected, NOT row-by-row
- **Transaction**: If approval fails midway (e.g., database error), rollback everything
- **Re-upload**: Partner must fix and upload entirely new file, cannot edit individual records

---

### Chart 3: Refurbishment Eligibility Calculation

**Description**: Background job that determines which centers are eligible for refurbishment.

```
[DAILY JOB - Runs at 00:00 midnight]
   â†“
SELECT * FROM centers WHERE status='active'
   â†“
For each center:
   â†“
   Get center.refurbishment_frequency_months (e.g., 36 months = 3 years)
   â†“
   Get center.last_refurbishment_date (or year_of_establishment if never refurbished)
   â†“
   Calculate: months_since = TIMESTAMPDIFF(MONTH, last_date, CURDATE())
   â†“
   Decision: months_since >= refurbishment_frequency_months?
      â”‚
      â”œâ”€ NO (Not yet eligible)
      â”‚   â†“
      â”‚   UPDATE centers.refurbishment_eligible = false
      â”‚   â†“
      â”‚   [Continue to next center]
      â”‚
      â””â”€ YES (Eligible!)
          â†“
          UPDATE centers.refurbishment_eligible = true
          â†“
          Decision: Was notification already sent in last 7 days?
             â”œâ”€ YES â†’ Skip notification (avoid spam)
             â”œâ”€ NO â†’ Continue
             â†“
          INSERT into notifications:
             recipient_role='ADMIN'
             type='system_alert'
             alert_type='refurbishment'
             title='Center Eligible for Refurbishment'
             message='Center [name] is now eligible. Last refurbishment: [date]. Frequency: [X] months.'
          â†“
          [Continue to next center]
   â†“
[END OF JOB]
   â†“
Admin logs in during the day
   â†“
Sees notification(s) for eligible centers
   â†“
Admin decides whether to create refurbishment request now or later
```

**Example Calculation**:

```
Center A:
- Established: 2018-06-15
- Last Refurbishment: 2021-08-20
- Frequency: 36 months
- Current Date: 2024-11-05
- Months Since: TIMESTAMPDIFF(MONTH, 2021-08-20, 2024-11-05) = 38 months
- Eligible? YES (38 >= 36)

Center B:
- Established: 2022-01-10
- Last Refurbishment: NULL (never refurbished)
- Frequency: 24 months
- Current Date: 2024-11-05
- Months Since: TIMESTAMPDIFF(MONTH, 2022-01-10, 2024-11-05) = 33 months
- Eligible? YES (33 >= 24)

Center C:
- Established: 2023-09-01
- Last Refurbishment: NULL
- Frequency: 36 months
- Current Date: 2024-11-05
- Months Since: TIMESTAMPDIFF(MONTH, 2023-09-01, 2024-11-05) = 14 months
- Eligible? NO (14 < 36)
```

---

### Chart 4: Scheduled Request Execution

**Description**: Background job for recurring upload requests.

```
[DAILY JOB - Runs at 09:00 AM]
   â†“
Query:
   SELECT * FROM scheduled_requests
   WHERE is_active = true
   AND next_scheduled_date <= CURDATE()
   â†“
Decision: Any due requests found?
   â”œâ”€ NO â†’ [END JOB]
   â†“
   YES
   â†“
For each due scheduled_request:
   â†“
   Get request details:
      - request_id (link to requests table)
      - partner_id, center_id
      - recurrence_type ('monthly', 'quarterly', 'semi_annual', 'annual', 'custom')
      - start_date, end_date, next_scheduled_date
   â†“
   Get original request details from requests table:
      - title, description
   â†“
   CREATE NOTIFICATION:
      INSERT into notifications (
         recipient_id = partner_user_id,
         type = 'request',
         alert_type = 'upload_request',
         title = [original request title],
         message = 'Scheduled reminder: Please upload data for [center]',
         remark = [original description],
         related_entity_type = 'request',
         related_entity_id = request_id
      )
   â†“
   UPDATE scheduled_requests:
      last_executed_at = NOW()
   â†“
   CALCULATE NEXT SCHEDULED DATE:
      If recurrence_type = 'monthly':
         next_scheduled_date = next_scheduled_date + INTERVAL 1 MONTH
      If recurrence_type = 'quarterly':
         next_scheduled_date = next_scheduled_date + INTERVAL 3 MONTH
      If recurrence_type = 'semi_annual':
         next_scheduled_date = next_scheduled_date + INTERVAL 6 MONTH
      If recurrence_type = 'annual':
         next_scheduled_date = next_scheduled_date + INTERVAL 1 YEAR
      If recurrence_type = 'custom':
         next_scheduled_date = [calculate based on custom formula]
   â†“
   Decision: next_scheduled_date > end_date?
      â”œâ”€ YES (Schedule completed)
      â”‚   â†“
      â”‚   UPDATE scheduled_requests.is_active = false
      â”‚   â†“
      â”‚   INSERT into audit_logs (action='scheduled_request_completed')
      â”‚   â†“
      â”‚   [Move to next scheduled_request]
      â”‚
      â””â”€ NO (Still active)
          â†“
          UPDATE scheduled_requests.next_scheduled_date = [calculated date]
          â†“
          [Move to next scheduled_request]
   â†“
[END OF JOB]
```

**Example Execution**:

```
Scheduled Request #1:
- recurrence_type: monthly
- start_date: 2024-01-01
- end_date: 2024-12-31
- next_scheduled_date: 2024-11-05
- Today: 2024-11-05

Action:
1. Send notification to partner
2. Update last_executed_at = 2024-11-05 09:00:00
3. Calculate: next_scheduled_date = 2024-11-05 + 1 MONTH = 2024-12-05
4. Check: 2024-12-05 <= 2024-12-31? YES â†’ Keep is_active = true
5. On 2024-12-05, repeat notification
6. Calculate: next_scheduled_date = 2024-12-05 + 1 MONTH = 2025-01-05
7. Check: 2025-01-05 <= 2024-12-31? NO â†’ Set is_active = false (schedule ends)
```

---

## Table Relationships

This section explains how tables connect to each other.

---

### Relationship 1: Users â†’ Partners â†’ Centers â†’ Batches

**Description**: Hierarchical relationship showing organizational structure.

```
users (Authentication layer)
   â†“ (Foreign Key: partner_id)
partners (Organization layer)
   â†“ (Foreign Key: partner_id)
centers (Physical location layer)
   â†“ (Foreign Key: center_id)
batches (Training group layer)
   â†“ (Foreign Key: batch_id) [FUTURE]
students (Individual learner layer)
```

**Relationship Details**:

```
users table:
   - id (primary key)
   - email, password_hash (login credentials)
   - partner_id (foreign key â†’ partners.id) [Can be NULL for admin users]
   - role (ADMIN, PARTNER, TRAINER, etc.)

   Relationship: users.partner_id â†’ partners.id (Many-to-One)
   Meaning: Many users can belong to one partner
   Example:
      - User "john@techskills.com" (id=1) â†’ partner_id = 100 â†’ Tech Skills Training
      - User "sarah@techskills.com" (id=2) â†’ partner_id = 100 â†’ Tech Skills Training (same partner)
      - User "admin@seif.in" (id=3) â†’ partner_id = NULL (admin, not linked to partner)

partners table:
   - id (primary key)
   - organization_name, email, phone, address
   - status (active, inactive)

   Relationship: partners.id â† centers.partner_id (One-to-Many)
   Meaning: One partner can have many centers
   Example:
      - Partner "Tech Skills Training" (id=100) has:
         - Center "Pune Branch 1" (id=200, partner_id=100)
         - Center "Pune Branch 2" (id=201, partner_id=100)
         - Center "Mumbai Branch 1" (id=202, partner_id=100)

centers table:
   - id (primary key)
   - partner_id (foreign key â†’ partners.id)
   - center_name, address, landmark, district, state
   - year_of_establishment, center_type, center_category
   - refurbishment_eligible, last_refurbishment_date, refurbishment_frequency_months
   - status (active, inactive)

   Relationship: centers.id â† batches.center_id (One-to-Many)
   Meaning: One center can have many batches
   Example:
      - Center "Pune Branch 1" (id=200) has:
         - Batch "2024-01-01" (id=300, center_id=200, batch_number=1, training_dates 2024-01-01 to 2024-03-31)
         - Batch "2024-04-01" (id=301, center_id=200, batch_number=2, training_dates 2024-04-01 to 2024-06-30)

batches table:
   - id (primary key)
   - center_id (foreign key â†’ centers.id)
   - batch_number, training_start_date, training_end_date
   - total_students, male_students, female_students, trans_students
   - status (active, completed)
```

**Query Examples**:

```sql
-- Get all centers for a specific partner:
SELECT c.* FROM centers c
JOIN partners p ON c.partner_id = p.id
WHERE p.organization_name = 'Tech Skills Training';

-- Get all batches for a specific center:
SELECT b.* FROM batches b
WHERE b.center_id = 200;

-- Get all users who can manage a specific center:
SELECT u.* FROM users u
JOIN partners p ON u.partner_id = p.id
JOIN centers c ON c.partner_id = p.id
WHERE c.id = 200 AND u.role = 'PARTNER';
```

---

### Relationship 2: Upload Flow (Staging to Approved)

**Description**: How uploaded data moves from staging tables to approved tables after admin review.

```
data_uploads (Upload metadata)
   â†“ (Foreign Key: data_upload_id)
uploaded_centers (Staging: pending approval)
   â†“ (Foreign Key: uploaded_center_id)
uploaded_batches (Staging: pending approval)
   â†“ (Foreign Key: uploaded_batch_id)
uploaded_students (Staging: pending approval)

      â†“â†“â†“ [ADMIN APPROVAL] â†“â†“â†“

centers (Approved: live data)
   â†“ (Foreign Key: center_id)
batches (Approved: live data)
   â†“ (Foreign Key: batch_id) [FUTURE]
students (Approved: live data)
```

**Detailed Relationships**:

```
data_uploads table:
   - id (primary key) - UUID e.g., "a1b2c3d4-5678-90ab-cdef-1234567890ab"
   - partner_id (foreign key â†’ partners.id)
   - upload_type ('center', 'batch', 'student')
   - file_url (S3 URL)
   - status ('pending', 'approved', 'rejected', 'failed')
   - total_records (count of rows in CSV)

   Relationship: data_uploads.id â† uploaded_centers.data_upload_id (One-to-Many)
   Meaning: One upload can contain multiple centers (though usually 1)
   Example:
      - Upload "a1b2c3d4..." (id=upload_1) contains:
         - uploaded_center "Pune Branch 1" (id=uc_1, data_upload_id=upload_1)
         - uploaded_center "Pune Branch 2" (id=uc_2, data_upload_id=upload_1) [if CSV has multiple centers]

uploaded_centers table:
   - id (primary key)
   - data_upload_id (foreign key â†’ data_uploads.id)
   - partner_id (foreign key â†’ partners.id)
   - center_name, address, etc. (same fields as centers table)
   - approval_status ('pending', 'approved', 'rejected')
   - approved_center_id (foreign key â†’ centers.id) [NULL until approved]
   - rejection_reason, remarks

   Relationship: uploaded_centers.id â† uploaded_batches.uploaded_center_id (One-to-Many)
   Meaning: One uploaded center can have many uploaded batches
   Example:
      - uploaded_center "uc_1" has:
         - uploaded_batch "Batch 1" (id=ub_1, uploaded_center_id=uc_1)
         - uploaded_batch "Batch 2" (id=ub_2, uploaded_center_id=uc_1)

   Relationship: uploaded_centers.approved_center_id â†’ centers.id (One-to-One after approval)
   Meaning: After admin approves, uploaded_center links to the newly created live center
   Example:
      - Admin approves uploaded_center "uc_1"
      - System creates new center "Pune Branch 1" (id=200) in centers table
      - System updates uploaded_centers: approved_center_id = 200

uploaded_batches table:
   - id (primary key)
   - data_upload_id (foreign key â†’ data_uploads.id)
   - uploaded_center_id (foreign key â†’ uploaded_centers.id)
   - batch_number, training_start_date, training_end_date, student counts
   - approval_status ('pending', 'approved', 'rejected')
   - approved_batch_id (foreign key â†’ batches.id) [NULL until approved]
   - rejection_reason, remarks

   Relationship: uploaded_batches.id â† uploaded_students.uploaded_batch_id (One-to-Many)
   Meaning: One uploaded batch has many uploaded students
   Example:
      - uploaded_batch "ub_1" has 50 uploaded_students records

uploaded_students table:
   - id (primary key)
   - data_upload_id (foreign key â†’ data_uploads.id)
   - uploaded_center_id (foreign key â†’ uploaded_centers.id)
   - uploaded_batch_id (foreign key â†’ uploaded_batches.id)
   - student_id, name, age, gender, education, etc.
   - approval_status ('pending', 'approved', 'rejected')
   - approved_student_id (foreign key â†’ students.id) [FUTURE]
```

**Approval Flow Example**:

```
BEFORE APPROVAL:
- data_uploads (id=upload_1, status='pending')
   - uploaded_centers (id=uc_1, data_upload_id=upload_1, approval_status='pending', approved_center_id=NULL)
      - uploaded_batches (id=ub_1, uploaded_center_id=uc_1, approval_status='pending', approved_batch_id=NULL)
         - uploaded_students (id=us_1, uploaded_batch_id=ub_1, approval_status='pending')
         - uploaded_students (id=us_2, uploaded_batch_id=ub_1, approval_status='pending')
         - ... (50 total students)

AFTER APPROVAL:
- data_uploads (id=upload_1, status='approved')
   - uploaded_centers (id=uc_1, approval_status='approved', approved_center_id=200)
      - uploaded_batches (id=ub_1, approval_status='approved', approved_batch_id=300)
         - uploaded_students (id=us_1, approval_status='approved', approved_student_id=1000)
         - uploaded_students (id=us_2, approval_status='approved', approved_student_id=1001)
         - ...

- centers (id=200, center_name='Pune Branch 1') â† newly created
   - batches (id=300, center_id=200, batch_number=1) â† newly created
      - students (id=1000, batch_id=300, student_id='SEIF-MH-00001') â† newly created [FUTURE]
      - students (id=1001, batch_id=300, student_id='SEIF-MH-00002') â† newly created [FUTURE]
      - ...
```

---

### Relationship 3: Refurbishment System (Complex Multi-Table)

**Description**: Course-based refurbishment with packages, attachments, and upgradation rooms.

```
requests (Master request)
   â†“ (Foreign Key: request_id)
refurbishment_requests (Refurbishment details)
   â†“ (Multiple relationships)
   â”œâ”€â†’ refurbishment_admin_selected_packages (Admin pre-selection per course)
   â”œâ”€â†’ refurbishment_request_course_packages (Partner final selection per course)
   â”œâ”€â†’ refurbishment_request_course_attachments (Photos per course)
   â”œâ”€â†’ refurbishment_upgradation_rooms (Room dimension details)
   â””â”€â†’ refurbishment_upgradation_photos (Room photos)

courses â† course_packages (Available packages per course)
   â†“ (Used by refurbishment tables)
center_courses (Which courses are offered at which centers)
```

**Detailed Relationships**:

```
requests table:
   - id (primary key) - UUID
   - request_number (unique: REQ-2024-00123)
   - type ('upload_request', 'refurbishment', 'scheduled_upload')
   - partner_id (foreign key â†’ partners.id)
   - center_id (foreign key â†’ centers.id) [Can be NULL for partner-level requests]
   - title, description
   - status ('pending', 'in_progress', 'partner_submitted', 'in_review', 'approved', 'rejected')
   - rejection_reason, remarks
   - created_by (foreign key â†’ users.id, admin who created)
   - reviewed_by (foreign key â†’ users.id, admin who reviewed)

   Relationship: requests.id â† refurbishment_requests.request_id (One-to-One)
   Meaning: One request can have one refurbishment_requests entry (if type='refurbishment')
   Example:
      - Request "REQ-2024-00789" (id=req_789, type='refurbishment')
         â†’ refurbishment_requests (id=refurb_456, request_id=req_789)

refurbishment_requests table:
   - id (primary key)
   - request_id (foreign key â†’ requests.id, UNIQUE)
   - center_id (foreign key â†’ centers.id)
   - refurbishment_type ('refurbishment', 'repair', 'maintenance')
   - is_upgradation_requested (boolean: did partner request room upgradation?)

   Relationships (One-to-Many):
      - refurbishment_requests.id â† refurbishment_admin_selected_packages.refurb_request_id
      - refurbishment_requests.id â† refurbishment_request_course_packages.refurb_request_id
      - refurbishment_requests.id â† refurbishment_request_course_attachments.refurb_request_id
      - refurbishment_requests.id â† refurbishment_upgradation_rooms.refurb_request_id

refurbishment_admin_selected_packages table:
   - id (primary key)
   - request_id (foreign key â†’ requests.id)
   - course_id (foreign key â†’ courses.id)
   - package_id (foreign key â†’ course_packages.id)

   Purpose: Admin pre-selects which packages partner should consider for each course
   Example:
      - Request req_789 for "Pune Branch 1" which offers "Electrical", "Solar", "Industrial Automation"
      - Admin creates entries:
         - (req_789, electrical_course_id, multimeter_package_id)
         - (req_789, electrical_course_id, oscilloscope_package_id)
         - (req_789, solar_course_id, solar_panel_package_id)
         - (req_789, industrial_automation_course_id, plc_kit_package_id)

refurbishment_request_course_packages table:
   - id (primary key)
   - refurb_request_id (foreign key â†’ refurbishment_requests.id)
   - course_id (foreign key â†’ courses.id)
   - package_id (foreign key â†’ course_packages.id)
   - quantity (integer, default 1)
   - justification (text: WHY partner needs this package)
   - remarks (text: additional notes)

   Purpose: Partner's FINAL selections (subset of admin pre-selected packages) with justifications
   Example (continuing from above):
      - Partner reviews admin pre-selections
      - Partner selects only what's actually needed:
         - (refurb_456, electrical_course_id, multimeter_package_id, quantity=1, justification="Current multimeters 8 years old, showing incorrect readings")
         - (refurb_456, solar_course_id, solar_panel_package_id, quantity=1, justification="Old generation panels, low efficiency")
      - NOTE: Partner did NOT select oscilloscope or PLC kit (doesn't need them)

refurbishment_request_course_attachments table:
   - id (primary key)
   - refurb_request_id (foreign key â†’ refurbishment_requests.id)
   - course_id (foreign key â†’ courses.id) [Groups photos by course]
   - file_url (S3 URL)
   - file_name
   - uploaded_by (foreign key â†’ users.id)

   Purpose: Store photos PER COURSE showing current equipment condition
   Example:
      - (refurb_456, electrical_course_id, "s3://...electrical_old_multimeters.jpg", "electrical_old_multimeters.jpg", partner_user_id)
      - (refurb_456, electrical_course_id, "s3://...electrical_broken_benches.jpg", "electrical_broken_benches.jpg", partner_user_id)
      - (refurb_456, solar_course_id, "s3://...solar_damaged_panels.jpg", "solar_damaged_panels.jpg", partner_user_id)

refurbishment_upgradation_rooms table:
   - id (primary key)
   - refurb_request_id (foreign key â†’ refurbishment_requests.id)
   - room_name
   - length_meters, breadth_meters, height_meters (decimal)
   - justification (text: why room needs upgradation)

   Purpose: If partner requests room expansion/renovation (optional)
   Example:
      - (refurb_456, "Electrical Lab Room 1", 12.5, 8.0, 3.5, "Room too small for 50 students. Need expansion.")

   Relationship: refurbishment_upgradation_rooms.id â† refurbishment_upgradation_photos.upgradation_room_id (One-to-Many)

refurbishment_upgradation_photos table:
   - id (primary key)
   - upgradation_room_id (foreign key â†’ refurbishment_upgradation_rooms.id)
   - file_url (S3 URL)
   - file_name
   - uploaded_by (foreign key â†’ users.id)

   Purpose: Photos of the room showing space constraints
   Example:
      - (room_1, "s3://...room_crowded.jpg", "room_crowded.jpg", partner_user_id)
      - (room_1, "s3://...room_exterior.jpg", "room_exterior.jpg", partner_user_id)
```

**Complex Query Example**:

```sql
-- Get complete refurbishment request with all details:
SELECT
   r.request_number,
   r.status,
   rf.refurbishment_type,
   c.center_name,

   -- Admin pre-selected packages by course
   (SELECT GROUP_CONCAT(CONCAT(co.course_name, ': ', cp.package_name) SEPARATOR ', ')
    FROM refurbishment_admin_selected_packages rasp
    JOIN courses co ON rasp.course_id = co.id
    JOIN course_packages cp ON rasp.package_id = cp.id
    WHERE rasp.request_id = r.id) AS admin_selected_packages,

   -- Partner final selections by course
   (SELECT GROUP_CONCAT(CONCAT(co.course_name, ': ', cp.package_name, ' (', rrcp.quantity, 'x)') SEPARATOR ', ')
    FROM refurbishment_request_course_packages rrcp
    JOIN courses co ON rrcp.course_id = co.id
    JOIN course_packages cp ON rrcp.package_id = cp.id
    WHERE rrcp.refurb_request_id = rf.id) AS partner_selected_packages,

   -- Attachments count per course
   (SELECT GROUP_CONCAT(CONCAT(co.course_name, ': ', COUNT(rrca.id), ' photos') SEPARATOR ', ')
    FROM refurbishment_request_course_attachments rrca
    JOIN courses co ON rrca.course_id = co.id
    WHERE rrca.refurb_request_id = rf.id
    GROUP BY co.course_name) AS attachment_counts,

   -- Upgradation room details
   rur.room_name,
   CONCAT(rur.length_meters, 'm x ', rur.breadth_meters, 'm x ', rur.height_meters, 'm') AS room_dimensions,
   (SELECT COUNT(*) FROM refurbishment_upgradation_photos WHERE upgradation_room_id = rur.id) AS room_photo_count

FROM requests r
JOIN refurbishment_requests rf ON r.id = rf.request_id
JOIN centers c ON r.center_id = c.id
LEFT JOIN refurbishment_upgradation_rooms rur ON rf.id = rur.refurb_request_id
WHERE r.id = 'req_789';
```

---

###Relationship 4: Notifications System

**Description**: How notifications link to different entities.

```
notifications table:
   - id (primary key)
   - recipient_id (foreign key â†’ users.id) [Can be NULL if recipient_role is set]
   - recipient_role ('ADMIN', 'PARTNER', 'TRAINER') [Used for broadcasting to all users of a role]
   - type ('request', 'response', 'approval', 'rejection', 'system_alert', 'reminder')
   - alert_type ('upload_request', 'data_approval', 'data_reject', 'refurbishment', etc.)
   - title, message, remark
   - related_entity_type ('request', 'data_upload', 'batch', 'center')
   - related_entity_id (UUID: can link to requests.id, data_uploads.id, etc.)
   - is_read (boolean)

Polymorphic Relationship: notifications.related_entity_id can link to multiple tables based on related_entity_type

Examples:
   - related_entity_type='request', related_entity_id=req_789 â†’ links to requests.id
   - related_entity_type='data_upload', related_entity_id=upload_1 â†’ links to data_uploads.id
   - related_entity_type='center', related_entity_id=200 â†’ links to centers.id
```

**Notification Types**:

```
1. Upload Notifications:
   - Admin creates upload request:
      recipient_id = partner_user_id
      type = 'request'
      alert_type = 'upload_request'
      related_entity_type = 'request'
      related_entity_id = request_id

   - Partner uploads data:
      recipient_role = 'ADMIN' (broadcast to all admins)
      type = 'system_alert'
      alert_type = 'new_upload'
      related_entity_type = 'data_upload'
      related_entity_id = data_upload_id

   - Admin approves upload:
      recipient_id = partner_user_id
      type = 'approval'
      alert_type = 'data_approval'
      related_entity_type = 'data_upload'
      related_entity_id = data_upload_id

   - Admin rejects upload:
      recipient_id = partner_user_id
      type = 'rejection'
      alert_type = 'data_reject'
      remark = "[rejection_reason]: [detailed remarks]"
      related_entity_type = 'data_upload'
      related_entity_id = data_upload_id

2. Refurbishment Notifications:
   - Center becomes eligible:
      recipient_role = 'ADMIN'
      type = 'system_alert'
      alert_type = 'refurbishment'
      related_entity_type = 'center'
      related_entity_id = center_id

   - Admin creates refurb request:
      recipient_id = partner_user_id
      type = 'request'
      alert_type = 'refurbishment'
      related_entity_type = 'request'
      related_entity_id = request_id

   - Partner submits refurb request:
      recipient_role = 'ADMIN'
      type = 'response'
      alert_type = 'refurbishment'
      related_entity_type = 'request'
      related_entity_id = request_id

   - Admin approves/rejects:
      recipient_id = partner_user_id
      type = 'approval' OR 'rejection'
      alert_type = 'refurbishment'
      related_entity_type = 'request'
      related_entity_id = request_id

3. Scheduled Request Notifications:
   - Daily job triggers:
      recipient_id = partner_user_id
      type = 'reminder'
      alert_type = 'upload_request'
      related_entity_type = 'request'
      related_entity_id = request_id
```

---

## Important Business Rules

These are critical rules that govern how the system works.

---

### Rule 1: Upload Approval Granularity

**Rule**: Uploads are approved or rejected **as a complete unit**. You CANNOT approve individual rows.

**Explanation**:

- When partner uploads a CSV with 1 center, 2 batches, and 50 students
- Admin must approve OR reject ALL of it together
- If even one student has wrong data, the ENTIRE upload must be rejected
- Partner then fixes the CSV and re-uploads everything

**Why**: Maintains data integrity. A center without batches or batches without students would create orphaned records.

**Database Implementation**:

- `data_uploads.status` applies to the entire upload
- `uploaded_centers.approval_status`, `uploaded_batches.approval_status`, `uploaded_students.approval_status` all get set to the same value ('approved' or 'rejected')
- On approval, all rows move to live tables in a single database transaction
- If transaction fails midway, rollback ensures no partial data

**Example**:

```
Upload contains:
- 1 center: "Pune Branch 1"
- 2 batches: "Batch 2024-01", "Batch 2024-02"
- 100 students: 50 in each batch

Admin finds:
- Center details: âœ… Correct
- Batch 1 details: âœ… Correct
- Batch 2 details: âœ… Correct
- Students 1-49: âœ… Correct
- Student 50: âŒ Invalid student ID format
- Students 51-100: âœ… Correct

Action:
- Admin REJECTS entire upload with remark: "Student ID at row 50 is invalid. Format should be SEIF-MH-00050 but got SEIF-MH-050."
- Partner fixes row 50 in CSV
- Partner re-uploads ENTIRE CSV with all 100 students
- Admin reviews again
```

---

### Rule 2: Refurbishment Eligibility Calculation

**Rule**: Center becomes eligible for refurbishment when `months_since_last_refurbishment >= refurbishment_frequency_months`.

**Formula**:

```
months_since = TIMESTAMPDIFF(MONTH, COALESCE(last_refurbishment_date, year_of_establishment), CURDATE())

is_eligible = (months_since >= refurbishment_frequency_months)
```

**Explanation**:

- If center has NEVER been refurbished, use `year_of_establishment` as starting point
- If center HAS been refurbished before, use `last_refurbishment_date`
- `refurbishment_frequency_months` is customizable per center (typically 24, 36, or 48 months)
- Background job runs daily at midnight to update `refurbishment_eligible` flag

**Example**:

```
Center: "Mumbai Branch 1"
- year_of_establishment: 2020-06-15
- last_refurbishment_date: 2022-08-20
- refurbishment_frequency_months: 24
- Current date: 2024-11-05

Calculation:
- months_since = TIMESTAMPDIFF(MONTH, 2022-08-20, 2024-11-05) = 26 months
- is_eligible = (26 >= 24) = TRUE

Result:
- UPDATE centers SET refurbishment_eligible = true WHERE id = center_id
- Send notification to admins: "Mumbai Branch 1 is now eligible for refurbishment"
```

**Special Cases**:

- If `refurbishment_frequency_months` is NULL or 0, center is NEVER eligible (manual requests only)
- If admin manually creates refurbishment request for non-eligible center, system allows it (override)
- After admin approves refurbishment request, system updates:
  - `last_refurbishment_date = CURDATE()`
  - `refurbishment_eligible = false`
- Next eligibility will be calculated after another X months

---

### Rule 3: Request Status Flow Progression

**Rule**: Request status must follow a specific order. You CANNOT skip steps or go backwards (except re-submission after rejection).

**Allowed Status Transitions**:

```
'pending' â†’ 'in_progress' â†’ 'partner_submitted' â†’ 'in_review' â†’ 'approved' âœ…
'pending' â†’ 'in_progress' â†’ 'partner_submitted' â†’ 'in_review' â†’ 'rejected' âœ…
'rejected' â†’ 'partner_submitted' (re-submission) âœ…
'pending' â†’ 'rejected' (admin cancels before partner works on it) âœ…

'approved' â†’ ANY OTHER STATUS âŒ (Final state, cannot change)
'in_review' â†’ 'pending' âŒ (Cannot go back)
'partner_submitted' â†’ 'pending' âŒ (Cannot go back)
```

**Status Meanings**:

- **pending**: Admin created request, partner hasn't started yet
- **in_progress**: Partner opened the request and is working on it (not stored in DB, just UI state)
- **partner_submitted**: Partner completed and submitted their response
- **in_review**: Admin opened the submission for review
- **approved**: Admin approved, request is complete
- **rejected**: Admin rejected, partner can revise and re-submit

**Database Enforcement**:

- `requests.status` ENUM field restricts values
- Application logic enforces transition rules
- `audit_logs` records all status changes for tracking

**Example Flow**:

```
Day 1:
- Admin creates refurbishment request for "Pune Branch 1"
- status = 'pending'
- Partner sees notification

Day 3:
- Partner opens request form
- UI shows status as 'in_progress' (not saved to DB yet)
- Partner selects packages, uploads photos

Day 5:
- Partner clicks "Submit"
- status = 'partner_submitted'
- Admin receives notification

Day 7:
- Admin clicks "Review"
- status = 'in_review'
- Admin examines selections and photos

Day 8:
- Admin finds issue: "You forgot to upload photos for Solar course"
- Admin clicks "Reject"
- status = 'rejected'
- rejection_reason = "Missing photos for Solar course"
- Partner receives notification

Day 10:
- Partner fixes by uploading missing photos
- Partner clicks "Re-submit"
- status = 'partner_submitted' (back to submitted state)
- Admin reviews again

Day 12:
- Admin sees all photos are present
- Admin clicks "Approve"
- status = 'approved'
- FINAL STATE - cannot change anymore
```

---

### Rule 4: Scheduled Request Recurrence Logic

**Rule**: Scheduled requests execute based on `recurrence_type` and automatically deactivate when `end_date` is passed.

**Recurrence Types**:

- **monthly**: Executes on the same day every month
- **quarterly**: Executes every 3 months
- **semi_annual**: Executes every 6 months
- **annual**: Executes every year
- **custom**: Custom formula (e.g., "first Monday of every month")

**Calculation Logic**:

```sql
-- After execution, calculate next date:
CASE recurrence_type
   WHEN 'monthly' THEN next_scheduled_date + INTERVAL 1 MONTH
   WHEN 'quarterly' THEN next_scheduled_date + INTERVAL 3 MONTH
   WHEN 'semi_annual' THEN next_scheduled_date + INTERVAL 6 MONTH
   WHEN 'annual' THEN next_scheduled_date + INTERVAL 1 YEAR
   WHEN 'custom' THEN [custom formula]
END

-- Check if schedule is complete:
IF new_next_scheduled_date > end_date THEN
   UPDATE is_active = false
END IF
```

**Example**:

```
Scheduled Request:
- recurrence_type: 'monthly'
- start_date: 2024-01-15
- end_date: 2024-12-15
- next_scheduled_date: 2024-01-15

Execution Timeline:
- 2024-01-15: Job runs, sends notification, next_scheduled_date = 2024-02-15
- 2024-02-15: Job runs, sends notification, next_scheduled_date = 2024-03-15
- 2024-03-15: Job runs, sends notification, next_scheduled_date = 2024-04-15
- ...
- 2024-12-15: Job runs, sends notification, next_scheduled_date = 2025-01-15
- Check: 2025-01-15 > 2024-12-15? YES â†’ UPDATE is_active = false
- Schedule is complete, no more notifications
```

**Edge Cases**:

- If `end_date` is NULL, schedule runs indefinitely until admin manually deactivates
- If job fails to run one day (server down), it catches up the next day and sends delayed notifications
- Partner can still respond even after notification (request doesn't expire)

---

### Rule 5: Notification Delivery

**Rule**: Notifications are **in-app only**. No emails or SMS. Notifications are **NOT deleted**, only marked as read.

**Delivery Methods**:

- **Individual**: `recipient_id` is set to specific user ID
- **Broadcast**: `recipient_role` is set to role name (e.g., 'ADMIN'), all users with that role see it

**Read Status**:

- New notification: `is_read = false`
- User clicks on notification: `UPDATE notifications SET is_read = true WHERE id = notification_id`
- Read notifications remain in database for audit trail

**Real-time Delivery** (if user is online):

- Backend uses WebSocket or Server-Sent Events (SSE)
- When notification is created, backend pushes to all connected users matching recipient criteria
- Frontend shows toast or updates notification bell counter

**Display Logic**:

```sql
-- For partner user to see their notifications:
SELECT * FROM notifications
WHERE (recipient_id = [current_user_id] OR recipient_role = [current_user_role])
AND is_read = false
ORDER BY created_at DESC;

-- For admin to see all system alerts:
SELECT * FROM notifications
WHERE recipient_role = 'ADMIN' OR recipient_id IN (
   SELECT id FROM users WHERE role = 'ADMIN'
)
AND is_read = false
ORDER BY created_at DESC;
```

**Example**:

```
Scenario: Admin approves partner's upload

CREATE NOTIFICATION:
   recipient_id = partner_user_123
   type = 'approval'
   alert_type = 'data_approval'
   title = 'Upload Approved'
   message = 'Your upload for Pune Branch 1 has been approved.'
   related_entity_type = 'data_upload'
   related_entity_id = upload_456
   is_read = false

If Partner is online:
   - WebSocket pushes notification to partner's browser
   - UI shows toast: "Upload Approved! Your upload for Pune Branch 1 has been approved."
   - Notification bell shows count: (3)

If Partner is offline:
   - Notification stored in database
   - When partner logs in next time:
      - Query notifications WHERE recipient_id = partner_user_123 AND is_read = false
      - Show count in bell: (3)
      - Partner clicks bell â†’ Sees list of unread notifications
      - Partner clicks notification â†’ UPDATE is_read = true â†’ Redirect to upload details page
```

---

### Rule 6: Audit Trail Requirements

**Rule**: ALL significant actions MUST be logged in `audit_logs` table for compliance and debugging.

**What to Log**:

- User authentication (login, logout, failed attempts)
- Data uploads (create, approve, reject)
- Requests (create, submit, approve, reject)
- Refurbishment (request creation, partner submission, admin approval/rejection)
- Partner creation/modification
- Center creation/modification
- Any status changes

**Audit Log Format**:

```json
{
  "user_id": "user-uuid",
  "action": "data_approved",
  "entity_type": "data_upload",
  "entity_id": "upload-uuid",
  "old_values": {
    "status": "pending",
    "reviewed_by": null,
    "reviewed_at": null
  },
  "new_values": {
    "status": "approved",
    "reviewed_by": "admin-uuid",
    "reviewed_at": "2024-11-05 14:30:00"
  },
  "timestamp": "2024-11-05 14:30:00",
  "ip_address": "192.168.1.10",
  "user_agent": "Mozilla/5.0..."
}
```

**Query Examples**:

```sql
-- View all actions by a specific user:
SELECT * FROM audit_logs
WHERE user_id = 'admin-uuid'
ORDER BY created_at DESC;

-- View history of a specific upload:
SELECT * FROM audit_logs
WHERE entity_type = 'data_upload' AND entity_id = 'upload-uuid'
ORDER BY created_at ASC;

-- View all rejections in last 30 days:
SELECT * FROM audit_logs
WHERE action IN ('data_rejected', 'refurbishment_rejected')
AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);
```

---

### Rule 7: File Storage (S3)

**Rule**: ALL uploaded files (CSVs, photos, attachments) MUST be stored in AWS S3, NOT in the database.

**Storage Structure**:

```
s3://seif-uploads/
   â”œâ”€â”€ partners/
   â”‚   â”œâ”€â”€ partner-uuid-1/
   â”‚   â”‚   â”œâ”€â”€ uploads/
   â”‚   â”‚   â”‚   â”œâ”€â”€ 2024-11-05_centers_upload.csv
   â”‚   â”‚   â”‚   â”œâ”€â”€ 2024-11-10_batch_upload.csv
   â”‚   â”‚   â””â”€â”€ refurbishments/
   â”‚   â”‚       â”œâ”€â”€ req-uuid-1/
   â”‚   â”‚       â”‚   â”œâ”€â”€ electrical/
   â”‚   â”‚       â”‚   â”‚   â”œâ”€â”€ photo1.jpg
   â”‚   â”‚       â”‚   â”‚   â”œâ”€â”€ photo2.jpg
   â”‚   â”‚       â”‚   â”œâ”€â”€ solar/
   â”‚   â”‚       â”‚   â”‚   â”œâ”€â”€ photo1.jpg
   â”‚   â”‚       â”‚   â””â”€â”€ rooms/
   â”‚   â”‚       â”‚       â”œâ”€â”€ room1.jpg
   â”‚   â”‚       â”‚       â”œâ”€â”€ room2.jpg
```

**Database Stores Only URLs**:

- `data_uploads.file_url` = "s3://seif-uploads/partners/partner-uuid-1/uploads/2024-11-05_centers_upload.csv"
- `refurbishment_request_course_attachments.file_url` = "s3://seif-uploads/partners/partner-uuid-1/refurbishments/req-uuid-1/electrical/photo1.jpg"
- `request_attachments.file_url` = "s3://seif-uploads/requests/req-uuid-1/template.xlsx"

**Access Control**:

- S3 bucket is **private**, not publicly accessible
- Frontend requests **pre-signed URLs** from backend for temporary access (expires in 15 minutes)
- Backend validates user permissions before generating pre-signed URL

**Example Flow**:

```
Partner wants to view uploaded CSV:
1. Partner clicks "Download" button in UI
2. Frontend calls: GET /api/data-uploads/{upload_id}/download
3. Backend checks:
   - Is current user authorized to access this upload? (same partner)
   - Generate S3 pre-signed URL valid for 15 minutes
4. Backend responds: { "download_url": "https://seif-uploads.s3.amazonaws.com/partners/.../file.csv?X-Amz-Signature=..." }
5. Frontend redirects to pre-signed URL
6. Browser downloads file directly from S3
```

---

### Rule 8: ESSCI Password Reset Policy

**Rule**: Users with role `ESSCI` are not allowed to generate self-service password reset tokens. They must request an admin to reset their password.

**Workflow**:

- ESSCI user clicks "Forgot password" or requests a reset in the UI.
- The frontend shows a message: "ESSCI users must request an admin to reset passwords. Click 'Request Admin Reset' to proceed." No `password_resets` token is generated automatically.
- The frontend creates a row in `password_reset_requests` with `status = 'pending'`.
- Admin reviews the request and either processes it (generates a `password_resets` token for the user or sets a temporary password) or declines it with a reason.
- Admin processing must create an `audit_logs` entry documenting who processed the reset and what action was taken.

**Database Implementation Notes**:

- Application must enforce: DO NOT create `password_resets` rows when `users.role = 'ESSCI'`.
- Use `password_reset_requests` to track the request lifecycle. Admins can then create a `password_resets` token or reset the password and update `password_reset_requests.status` to `processed`.

## Summary

This document covers:

1. **Database Overview**: What the SEIF Portal database is and why it exists
2. **Table Categories**: 27 tables organized into 10 logical groups
3. **Detailed Table Descriptions**: Purpose, fields, indexes, relationships, and sample data for each table
4. **Data Flow Diagrams**: Step-by-step flows for upload, review, scheduled requests, and refurbishment
5. **Process Flowcharts**: Decision points and status transitions
6. **Table Relationships**: How tables connect (hierarchical, staging-to-approved, refurbishment system, notifications)
7. **Important Business Rules**: Critical system behaviors (approval granularity, eligibility calculation, status flow, notifications, audit trails, file storage)

This document serves both **technical developers** (who need to understand the schema and write queries) and **non-technical stakeholders** (who need to understand business processes and data flows).

---

**Document Version**: 1.0  
**Last Updated**: November 5, 2024  
**Maintained By**: SEIF Development Team
