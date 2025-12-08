# SEIF Portal - CSV Upload Template Specification

## Document Purpose

This document provides the **exact CSV file structure** required for uploading center, batch, and student data to the SEIF Portal. Share this with partners or use it to generate sample CSV files.

**Last Updated:** November 19, 2025

---

## File Naming Convention

**Format:** `Partnername_UPLOAD_YYYYMMDD.csv`

**Examples:**

- `TechSkills_UPLOAD_20241119.csv`
- `DonBoscoTech_UPLOAD_20250115.csv`
- `SkillTraining_UPLOAD_20241225.csv`

**Rules:**

- Partner name should be **without spaces** or use **underscores** for spaces
- Date format: **YYYYMMDD** (Year-Month-Day, all digits)
- File extension: **.csv** (lowercase)

---

## CSV Structure Overview

### Key Concepts

1. **One CSV can contain MULTIPLE CENTERS** - Rows are grouped by `Center ID`
2. **One CSV can contain MULTIPLE BATCHES** per center - Rows are grouped by `Batch Number`
3. **Each row represents ONE STUDENT** - All center/batch info repeats for each student
4. **No header variations** - Must use exact column names as specified below

### Data Hierarchy in CSV

```
CSV File
├─ Center 1 (Center ID: C001)
│  ├─ Batch 1 (Batch Number: BATCH-2024-Q3)
│  │  ├─ Student 1 (Row 1)
│  │  ├─ Student 2 (Row 2)
│  │  └─ Student 3 (Row 3)
│  └─ Batch 2 (Batch Number: BATCH-2024-Q4)
│     ├─ Student 4 (Row 4)
│     └─ Student 5 (Row 5)
└─ Center 2 (Center ID: C002)
   └─ Batch 1 (Batch Number: BATCH-2024-Q3)
      ├─ Student 6 (Row 6)
      └─ Student 7 (Row 7)
```

---

## CSV Column Specification

### **IMPORTANT: Exact Column Order and Names Required**

**Total Columns:** 33 (Partner ID removed - auto-filled by system)

**Column Header Row (First Row of CSV):**

```csv
Partner Name,Center ID,Center Name,Center Type,Region,City,State,Address,Year of Establishment,Status,Center Head,Center Mobile,Center Email,Batch Number,Batch Start Date,Batch Complete Date,Total Students,Male Students,Female Students,Batch Status,Student ID,Student Name,Date of Birth,Gender,Student Mobile,Student Email,Student Address,Student City,Student State,Enrollment Date,Course Name,Course Duration (Months),Training Status
```

---

## Detailed Column Specifications

### **CENTER DETAILS (Columns 1-13)**

_These values repeat for all students belonging to the same center_

| #   | Column Name           | Required | Data Type | Max Length | Allowed Values                          | Example                                |
| --- | --------------------- | -------- | --------- | ---------- | --------------------------------------- | -------------------------------------- |
| 1   | Partner Name          | ✅ Yes   | Text      | 255        | Any text                                | Tech Skills Training Pvt Ltd           |
| 2   | Center ID             | ✅ Yes   | Text      | 100        | Alphanumeric, unique per CSV            | C001                                   |
| 3   | Center Name           | ✅ Yes   | Text      | 255        | Any text                                | Pune Training Center                   |
| 4   | Center Type           | ✅ Yes   | Text      | 100        | Short Term, Long Term, ITI, Polytechnic | Short Term                             |
| 5   | Region                | ✅ Yes   | Text      | 100        | North, South, East, West, Central       | West                                   |
| 6   | City                  | ✅ Yes   | Text      | 100        | Any valid city                          | Pune                                   |
| 7   | State                 | ✅ Yes   | Text      | 100        | Any valid Indian state                  | Maharashtra                            |
| 8   | Address               | ❌ No    | Text      | 500        | Any text                                | Plot No 15, MIDC Industrial Area, Pune |
| 9   | Year of Establishment | ❌ No    | Number    | 4 digits   | 1900-2025                               | 2018                                   |
| 10  | Status                | ✅ Yes   | Text      | 50         | active, inactive, under_maintenance     | active                                 |
| 11  | Center Head           | ❌ No    | Text      | 255        | Any text                                | Rajesh Kumar                           |
| 12  | Center Mobile         | ❌ No    | Text      | 10 digits  | Indian mobile format                    | 9876543210                             |
| 13  | Center Email          | ❌ No    | Email     | 255        | Valid email format                      | rajesh.kumar@techskills.com            |

**IMPORTANT:** Partner ID is automatically filled by the system based on your login session. Do NOT include this column in your CSV.

**Validation Rules:**

- Center ID must be **unique within the CSV file**
- All rows with same Center ID are grouped as one center
- Center Type must match one of: `Short Term`, `Long Term`, `ITI`, `Polytechnic`
- Region must match one of: `North`, `South`, `East`, `West`, `Central`
- Mobile number must be **10 digits** without country code or special characters
- Email must be valid format: `name@domain.com`

---

### **BATCH DETAILS (Columns 14-20)**

_These values repeat for all students belonging to the same batch_

| #   | Column Name         | Required | Data Type | Max Length | Allowed Values               | Example       |
| --- | ------------------- | -------- | --------- | ---------- | ---------------------------- | ------------- |
| 14  | Batch Number        | ✅ Yes   | Text      | 100        | Any text, unique per center  | BATCH-2024-Q4 |
| 15  | Batch Start Date    | ✅ Yes   | Date      | -          | DD-MM-YYYY                   | 15-10-2024    |
| 16  | Batch Complete Date | ❌ No    | Date      | -          | DD-MM-YYYY                   | 15-01-2025    |
| 17  | Total Students      | ✅ Yes   | Number    | -          | Positive integer             | 25            |
| 18  | Male Students       | ✅ Yes   | Number    | -          | Positive integer             | 15            |
| 19  | Female Students     | ✅ Yes   | Number    | -          | Positive integer             | 10            |
| 20  | Batch Status        | ✅ Yes   | Text      | 50         | active, completed, cancelled | active        |

**Validation Rules:**

- Batch Number must be **unique within each center**
- Date format must be **DD-MM-YYYY** (e.g., 15-10-2024, not 2024-10-15)
- Batch Complete Date must be **after** Batch Start Date
- Total Students = Male Students + Female Students (must match exactly)
- Male/Female count must not exceed Total Students
- Batch Status must match one of: `active`, `completed`, `cancelled`

---

### **STUDENT DETAILS (Columns 21-33)**

_Each row represents ONE unique student_

| #   | Column Name              | Required | Data Type | Max Length | Allowed Values                                 | Example                  |
| --- | ------------------------ | -------- | --------- | ---------- | ---------------------------------------------- | ------------------------ |
| 21  | Student ID               | ✅ Yes   | Text      | 100        | Unique per batch                               | STU-2024-001             |
| 22  | Student Name             | ✅ Yes   | Text      | 255        | Any text                                       | Priya Sharma             |
| 23  | Date of Birth            | ❌ No    | Date      | -          | DD-MM-YYYY, Age 16-60                          | 25-05-2000               |
| 24  | Gender                   | ✅ Yes   | Text      | 20         | Male, Female, Other                            | Female                   |
| 25  | Student Mobile           | ❌ No    | Text      | 10 digits  | Indian mobile format                           | 9123456789               |
| 26  | Student Email            | ❌ No    | Email     | 255        | Valid email format                             | priya.sharma@example.com |
| 27  | Student Address          | ❌ No    | Text      | 500        | Any text                                       | 123 MG Road, Pune        |
| 28  | Student City             | ❌ No    | Text      | 100        | Any valid city                                 | Pune                     |
| 29  | Student State            | ❌ No    | Text      | 100        | Any valid Indian state                         | Maharashtra              |
| 30  | Enrollment Date          | ❌ No    | Date      | -          | DD-MM-YYYY                                     | 15-10-2024               |
| 31  | Course Name              | ✅ Yes   | Text      | 255        | Must match existing course (flexible matching) | Electrical               |
| 32  | Course Duration (Months) | ❌ No    | Number    | -          | 1-36 months                                    | 6                        |
| 33  | Training Status          | ✅ Yes   | Text      | 50         | enrolled, in_progress, completed, dropped      | in_progress              |

**Validation Rules:**

- Student ID must be **unique within each batch**
- Date of Birth must result in age between **16-60 years**
- Gender must match one of: `Male`, `Female`, `Other`
- Course Name: **Flexible matching** applied - system accepts variations like:
  - Case differences: "electrical", "ELECTRICAL", "Electrical" → all accepted
  - Spacing variations: "Industrial Automation", "IndustrialAutomation" → both accepted
  - Minor typos: 1-2 character differences tolerated (e.g., "Electricl" → "Electrical")
- Training Status must match one of: `enrolled`, `in_progress`, `completed`, `dropped`
- Enrollment Date should be on or after Batch Start Date

---

## Sample CSV File

### Example 1: Single Center, Single Batch, 3 Students

```csv
Partner Name,Center ID,Center Name,Center Type,Region,City,State,Address,Year of Establishment,Status,Center Head,Center Mobile,Center Email,Batch Number,Batch Start Date,Batch Complete Date,Total Students,Male Students,Female Students,Batch Status,Student ID,Student Name,Date of Birth,Gender,Student Mobile,Student Email,Student Address,Student City,Student State,Enrollment Date,Course Name,Course Duration (Months),Training Status
Tech Skills Training,C001,Pune Training Center,Short Term,West,Pune,Maharashtra,Plot No 15 MIDC Industrial Area,2018,active,Rajesh Kumar,9876543210,rajesh@techskills.com,BATCH-2024-Q4,15-10-2024,15-01-2025,3,2,1,active,STU-2024-001,Priya Sharma,25-05-2000,Female,9123456789,priya.sharma@example.com,123 MG Road,Pune,Maharashtra,15-10-2024,Electrical,6,in_progress
Tech Skills Training,C001,Pune Training Center,Short Term,West,Pune,Maharashtra,Plot No 15 MIDC Industrial Area,2018,active,Rajesh Kumar,9876543210,rajesh@techskills.com,BATCH-2024-Q4,15-10-2024,15-01-2025,3,2,1,active,STU-2024-002,Amit Verma,10-08-1999,Male,9234567890,amit.verma@example.com,456 FC Road,Pune,Maharashtra,15-10-2024,Electrical,6,in_progress
Tech Skills Training,C001,Pune Training Center,Short Term,West,Pune,Maharashtra,Plot No 15 MIDC Industrial Area,2018,active,Rajesh Kumar,9876543210,rajesh@techskills.com,BATCH-2024-Q4,15-10-2024,15-01-2025,3,2,1,active,STU-2024-003,Rahul Singh,15-03-2001,Male,9345678901,rahul.singh@example.com,789 Shivaji Nagar,Pune,Maharashtra,15-10-2024,Electrical,6,enrolled
```

---

### Example 2: Multiple Centers, Multiple Batches

```csv
Partner Name,Center ID,Center Name,Center Type,Region,City,State,Address,Year of Establishment,Status,Center Head,Center Mobile,Center Email,Batch Number,Batch Start Date,Batch Complete Date,Total Students,Male Students,Female Students,Batch Status,Student ID,Student Name,Date of Birth,Gender,Student Mobile,Student Email,Student Address,Student City,Student State,Enrollment Date,Course Name,Course Duration (Months),Training Status
Tech Skills Training,C001,Pune Training Center,Short Term,West,Pune,Maharashtra,Plot No 15 MIDC,2018,active,Rajesh Kumar,9876543210,rajesh@techskills.com,BATCH-2024-Q3,01-07-2024,01-10-2024,2,1,1,completed,STU-Q3-001,Priya Sharma,25-05-2000,Female,9123456789,priya@example.com,123 MG Road,Pune,Maharashtra,01-07-2024,Electrical,6,completed
Tech Skills Training,C001,Pune Training Center,Short Term,West,Pune,Maharashtra,Plot No 15 MIDC,2018,active,Rajesh Kumar,9876543210,rajesh@techskills.com,BATCH-2024-Q3,01-07-2024,01-10-2024,2,1,1,completed,STU-Q3-002,Amit Verma,10-08-1999,Male,9234567890,amit@example.com,456 FC Road,Pune,Maharashtra,01-07-2024,Electrical,6,completed
Tech Skills Training,C001,Pune Training Center,Short Term,West,Pune,Maharashtra,Plot No 15 MIDC,2018,active,Rajesh Kumar,9876543210,rajesh@techskills.com,BATCH-2024-Q4,15-10-2024,15-01-2025,2,1,1,active,STU-Q4-001,Rahul Singh,15-03-2001,Male,9345678901,rahul@example.com,789 Shivaji Nagar,Pune,Maharashtra,15-10-2024,Electrical,6,in_progress
Tech Skills Training,C001,Pune Training Center,Short Term,West,Pune,Maharashtra,Plot No 15 MIDC,2018,active,Rajesh Kumar,9876543210,rajesh@techskills.com,BATCH-2024-Q4,15-10-2024,15-01-2025,2,1,1,active,STU-Q4-002,Sneha Patil,20-12-2002,Female,9456789012,sneha@example.com,321 Camp Area,Pune,Maharashtra,15-10-2024,Solar,6,enrolled
Tech Skills Training,C002,Mumbai Training Center,Long Term,West,Mumbai,Maharashtra,Andheri East,2020,active,Suresh Iyer,9567890123,suresh@techskills.com,BATCH-2024-Q4,01-10-2024,01-04-2025,2,2,0,active,STU-MUM-001,Vijay Kumar,05-06-1998,Male,9678901234,vijay@example.com,LBS Marg,Mumbai,Maharashtra,01-10-2024,Electrical,12,in_progress
Tech Skills Training,C002,Mumbai Training Center,Long Term,West,Mumbai,Maharashtra,Andheri East,2020,active,Suresh Iyer,9567890123,suresh@techskills.com,BATCH-2024-Q4,01-10-2024,01-04-2025,2,2,0,active,STU-MUM-002,Karan Mehta,12-09-2000,Male,9789012345,karan@example.com,SV Road,Mumbai,Maharashtra,01-10-2024,Electrical,12,enrolled
```

**Explanation:**

- **Center C001** has 2 batches (Q3 completed, Q4 active) with 4 total students
- **Center C002** has 1 batch (Q4 active) with 2 students
- Total: 2 centers, 3 batches, 6 students in one CSV file

---

## Available Course Names (Must Match Exactly)

**IMPORTANT:** The `Course Name` column must exactly match one of these pre-defined courses in the system:

1. **Electrical**
2. **Solar**
3. **Industrial Automation**
4. **Plumbing**
5. **HVAC** (Heating, Ventilation, and Air Conditioning)
6. **Electronics**
7. **IT Hardware**
8. **Welding**
9. **Carpentry**
10. **Mason**

**Note:** Course names are **case-sensitive**. Use the exact spelling as shown above.

---

## Common Validation Errors and Solutions

### Error 1: Date Format Incorrect

**Error:** "Invalid date format in Batch Start Date"

**Solution:** Use DD-MM-YYYY format

- ✅ Correct: `15-10-2024`
- ❌ Wrong: `2024-10-15`, `10/15/2024`, `15/10/24`

---

### Error 2: Total Students Mismatch

**Error:** "Total Students does not equal Male + Female Students"

**Solution:** Ensure the sum matches

- ✅ Correct: Total=25, Male=15, Female=10 (15+10=25)
- ❌ Wrong: Total=25, Male=15, Female=12 (15+12=27 ≠ 25)

---

### Error 3: Duplicate Student ID

**Error:** "Student ID 'STU-2024-001' already exists in batch 'BATCH-2024-Q4'"

**Solution:** Use unique Student IDs within each batch

- ✅ Correct: STU-2024-001, STU-2024-002, STU-2024-003
- ❌ Wrong: STU-2024-001, STU-2024-001, STU-2024-002 (duplicate)

---

### Error 4: Invalid Course Name

**Error:** "Course 'Electrician' not found"

**Solution:** Use exact course name from the list

- ✅ Correct: `Electrical`
- ❌ Wrong: `Electrician`, `electrical`, `ELECTRICAL`

---

### Error 5: Invalid Center Type

**Error:** "Center Type 'Short-Term' is invalid"

**Solution:** Use exact values without hyphens or extra spaces

- ✅ Correct: `Short Term` (space, not hyphen)
- ❌ Wrong: `Short-Term`, `short term`, `SHORT TERM`

---

## Step-by-Step Instructions for Creating CSV

### Using Microsoft Excel:

1. **Open Excel** and create a new blank workbook
2. **Type the header row** (Row 1) with all 34 column names exactly as specified
3. **Enter data** starting from Row 2
   - Fill center details (same for all students of that center)
   - Fill batch details (same for all students of that batch)
   - Fill unique student details for each row
4. **Save As** → Choose "CSV (Comma delimited) (\*.csv)"
5. **Rename** the file following the naming convention
6. **Open in Notepad** to verify commas are correct (no extra quotes or formatting)

### Using Google Sheets:

1. **Open Google Sheets** and create a new spreadsheet
2. **Type the header row** (Row 1) with all 34 column names
3. **Enter data** starting from Row 2
4. **File** → **Download** → **Comma Separated Values (.csv)**
5. **Rename** the file following the naming convention

---

## Data Validation Checklist

Before uploading, verify:

- [ ] File name follows format: `Partnername_UPLOAD_YYYYMMDD.csv`
- [ ] Header row has exactly 34 columns in correct order
- [ ] No empty rows (except header)
- [ ] All required fields (marked ✅) are filled
- [ ] Date format is DD-MM-YYYY (not YYYY-MM-DD)
- [ ] Total Students = Male Students + Female Students
- [ ] Center Type is one of: Short Term, Long Term, ITI, Polytechnic
- [ ] Region is one of: North, South, East, West, Central
- [ ] Course Name matches existing course exactly
- [ ] Training Status is one of: enrolled, in_progress, completed, dropped
- [ ] Batch Status is one of: active, completed, cancelled
- [ ] Mobile numbers are 10 digits (no country code, no special characters)
- [ ] Email addresses are valid format
- [ ] Student IDs are unique within each batch
- [ ] Batch Numbers are unique within each center
- [ ] Center IDs are unique within the CSV

---

## System Behavior After Upload

### Backend Processing:

1. **File Upload** → Saves to `backend/uploads/` folder
2. **CSV Parsing** → Reads and validates each row
3. **Data Grouping:**
   - Groups rows by `Center ID` → Creates entries in `uploaded_centers` table
   - Groups rows by `Batch Number` → Creates entries in `uploaded_batches` table
   - Each row → Creates entry in `uploaded_students` table
4. **Status** → All records marked as `pending` approval
5. **Notification** → Admin receives in-app notification about new upload

### Admin Review Process:

1. Admin sees notification in Inbox
2. Admin views all centers, batches, and students from the upload
3. Admin can:
   - **Approve All** → Moves data from staging tables (`uploaded_*`) to main tables (`centers`, `batches`)
   - **Reject All** → Marks upload as rejected with reason/remarks
4. Partner receives notification of approval/rejection

### Version History:

- Each upload gets a unique version number (v1, v2, v3...)
- If partner re-uploads corrected data, new version is created
- All versions are preserved for audit trail

---

## Technical Notes for Developers

### CSV Parsing Logic:

```javascript
// Pseudo-code for CSV processing
1. Parse CSV file row by row
2. Group rows by csv_center_id:
   - Create one uploaded_centers record per unique csv_center_id
   - Use first row with that csv_center_id for center details
3. Group rows by (csv_center_id + batch_number):
   - Create one uploaded_batches record per unique combination
   - Link to uploaded_centers via uploaded_center_id
4. For each row:
   - Create uploaded_students record
   - Link to uploaded_centers and uploaded_batches
5. Set all approval_status = 'pending'
6. Create notification for admin
```

### Database Tables Used:

- `data_uploads` → Stores upload metadata (file URL, status, etc.)
- `uploaded_centers` → Staging table for centers (pending approval)
- `uploaded_batches` → Staging table for batches (pending approval)
- `uploaded_students` → Staging table for students (pending approval)
- `notifications` → Alert admin of new upload

After admin approval:

- `centers` → Approved centers
- `batches` → Approved batches
- (Future: `students` table for approved students)

---

## Support and Questions

If you encounter issues with CSV format or upload errors:

1. **Check this document** for correct format and validation rules
2. **Verify your data** against the validation checklist
3. **Contact SEIF Support** with:
   - Your CSV file
   - Error message received
   - Upload date and time

---

**Document Version:** 1.0  
**Last Updated:** November 19, 2025  
**Maintained By:** SEIF Development Team
