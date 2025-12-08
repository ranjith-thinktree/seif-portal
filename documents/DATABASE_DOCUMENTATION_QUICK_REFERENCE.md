# DATABASE DOCUMENTATION - QUICK REFERENCE

## Document Details

- **Full Document**: `DATABASE_DOCUMENTATION.md`
- **Total Lines**: 3,686 lines
- **File Size**: Comprehensive coverage of entire SEIF Portal database
- **Last Updated**: November 5, 2024

---

## What's Inside

### 1. Database Overview

- What is the SEIF Portal database
- Key concepts and terminology
- Database statistics (27 tables, 10 categories)

### 2. Table Categories (10 Groups)

1. **Authentication & Users** - User login and permissions
2. **Partners** - Training partner organizations
3. **Lookup Tables** - Courses and packages
4. **Centers & Batches** - Training locations and groups
5. **Data Uploads** - CSV upload system with staging tables
6. **Requests** - Upload and refurbishment requests
7. **Refurbishment System** - Equipment replacement (course-based)
8. **Request Support** - Comments and attachments
9. **Notifications** - In-app alerts
10. **Reporting & Audit** - Downloads and audit trail

### 3. Detailed Table Documentation (27 Tables)

Each table includes:

- **Purpose**: What the table stores and why
- **Key Fields**: Complete field list with descriptions, data types, constraints
- **Indexes**: Performance optimization
- **Relationships**: Foreign keys and connections to other tables
- **Sample Data**: Real-world examples showing how data looks

### 4. Data Flow Diagrams (4 Major Flows)

- **Flow 1**: Partner Uploads Center Data (13-step process)
- **Flow 2**: Admin Reviews and Approves Upload (6-step process with approval/rejection paths)
- **Flow 3**: Admin Creates Scheduled Upload Request (7-step process with recurring logic)
- **Flow 4**: Refurbishment Request (13-step complete course-based flow)

### 5. Process Flowcharts (4 Charts)

- **Chart 1**: Request Status Flow (all possible status transitions)
- **Chart 2**: Upload Approval Process (detailed validation and approval flow)
- **Chart 3**: Refurbishment Eligibility Calculation (background job logic)
- **Chart 4**: Scheduled Request Execution (recurring request handling)

### 6. Table Relationships (4 Major Relationship Groups)

- **Relationship 1**: Users → Partners → Centers → Batches (hierarchical structure)
- **Relationship 2**: Upload Flow - Staging to Approved (how data moves through approval)
- **Relationship 3**: Refurbishment System (complex multi-table with courses and packages)
- **Relationship 4**: Notifications System (polymorphic relationships)

### 7. Important Business Rules (7 Critical Rules)

1. **Upload Approval Granularity** - All-or-nothing approval, no row-by-row
2. **Refurbishment Eligibility Calculation** - Formula and edge cases
3. **Request Status Flow Progression** - Allowed transitions, no backward movement
4. **Scheduled Request Recurrence Logic** - How recurring requests work
5. **Notification Delivery** - In-app only, broadcast vs individual
6. **Audit Trail Requirements** - What must be logged
7. **File Storage (S3)** - Where files are stored and how to access

---

## Quick Navigation

### For Developers

- **Schema Understanding**: See "Table Categories" (page ~15)
- **Query Examples**: Each table section has SQL examples
- **Relationships**: "Table Relationships" section (page ~2800)
- **API Logic**: "Data Flow Diagrams" (page ~1600)

### For Business Users

- **Process Overview**: "Database Overview" (page ~1)
- **How Uploads Work**: "Data Flow Diagrams - Flow 1 & 2" (page ~1600)
- **How Refurbishment Works**: "Data Flow Diagrams - Flow 4" (page ~1700)
- **Business Rules**: "Important Business Rules" (page ~3400)

### For Testers

- **Test Scenarios**: "Process Flowcharts" (page ~2500)
- **Edge Cases**: "Important Business Rules" (page ~3400)
- **Sample Data**: Each table has sample data showing valid examples

---

## Key Tables by Function

### Authentication

- `users` - Login credentials and roles
- `password_resets` - Password reset tokens

### Core Data

- `partners` - Training partner organizations
- `centers` - Training locations
- `batches` - Training groups
- `courses` - Available courses
- `course_packages` - Equipment packages per course

### Upload System

- `data_uploads` - Upload metadata
- `uploaded_centers`, `uploaded_batches`, `uploaded_students` - Staging tables

### Request System

- `requests` - Master request table
- `scheduled_requests` - Recurring upload requests
- `refurbishment_requests` - Equipment replacement requests
- `refurbishment_request_course_packages` - Partner selections per course
- `refurbishment_request_course_attachments` - Photos per course
- `refurbishment_upgradation_rooms` - Room expansion requests

### System Tables

- `notifications` - In-app alerts
- `audit_logs` - Action history
- `download_logs` - Report downloads

---

## Document Highlights

✅ **Written in Simple English** - Both technical and non-technical readers can understand

✅ **Complete Coverage** - All 27 tables documented with full details

✅ **Real-World Examples** - Sample data shows exactly how data looks

✅ **Step-by-Step Flows** - Data flows explained like "Step 1 → Step 2 → Step 3"

✅ **Decision Points** - Flowcharts show where choices are made (approve vs reject)

✅ **Business Context** - Why each table exists and how it's used

✅ **SQL Examples** - Query examples for developers

✅ **Relationship Diagrams** - How tables connect to each other

---

## How to Use This Document

1. **First Time Reading**: Start with "Database Overview" to understand the big picture

2. **Looking for a Specific Table**: Use Table of Contents to jump to the table

3. **Understanding a Process**: Read the relevant "Data Flow Diagram"

4. **Writing Queries**: Check "Table Relationships" to see foreign keys

5. **Testing**: Use "Process Flowcharts" for test case ideas

6. **Business Questions**: Read "Important Business Rules" for policies

---

## Contact

For questions or updates to this document, contact the SEIF Development Team.

**Document Version**: 1.0  
**Generated**: November 5, 2024
