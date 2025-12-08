### **A. Partner Dashboard Flow**

**Goal:** Partners upload data, manage profile, raise requests, and receive notifications.

| Section | Screen Name | Screens Count |
| ----- | ----- | ----- |
| 1\. Login & Access | Partner Login, Password Reset | 2 |
| 2\. Home | Partner Dashboard Overview (stats, alerts summary) | 1 |
| 3\. Data Upload | Upload Data (Trainee, Trainer, Center, Certification) | 4 |
| 4\. Data Management | View / Edit Uploaded Data (tabular view \+ filters) | 2 |
| 5\. Inbox | Alerts Tab, Requests Tab, Past Requests View, Raise Request Form | 4 |
| 6\. Profile | Partner Profile View, Edit Profile, Manage Access | 3 |
| 7\. Certification | Upload Certification, View Certification Status, Download Certificates | 3 |
|  |  |  |
|  |  |  |
| **Subtotal (Partner Flow)** |  | **21 Screens** |

### **B. Admin Dashboard Flow**

**Goal:** Admin manages partners, reviews data uploads, approves/rejects requests, and sends notifications.

| Section | Screen Name | Screens Count |
| ----- | ----- | ----- |
| 1\. Login & Access | Admin Login | 1 |
| 2\. Home | Admin Dashboard Overview (Key stats \+ Geographic Distribution \+ Recent Activity) | 1 |
| 3\. Data | Partner List View, Partner Detail View, Center List under Partner, Data Table View, Edit Data Review Modal | 5 |
| 4\. Inbox | Alerts Tab, Requests Tab, Past Requests View, View Request Details | 4 |
| 5\. User Management | Manage Access, Add / Remove Roles | 2 |
| 6\. Refurbishment | Eligibility Overview, Past Requests, Admin-to-Partner Communication Form | 3 |
| 7\. Certification Management | View Certification Uploads, Approve/Reject Certification, Download Summary | 3 |
| 8\. Profile | Admin Profile, Edit Details | 2 |
| **Subtotal (Admin Flow)** |  | **21 Screens** |

### **C. SE View / Super Admin (SEIF HQ)**

**Goal:** High-level Schneider Electric team view for analytics and reports only.

| Section | Screen Name | Screens Count |
| ----- | ----- | ----- |
| 1\. Login | SEIF Login (Read-only mode) | 1 |
| 2\. Home | SEIF Dashboard (Aggregated stats, map, reports) | 1 |
| 3\. Reporting | Filtered Report View, Export Options | 2 |
| 4\. Partner Insights | Partner Summary (eligibility, activity logs) | 2 |
| **Subtotal (SEIF View)** |  | **6 Screens** |

### **D. Certification Upload & Download Flow**

**Goal:** Unified certification upload, validation, and download process for both Partner and Admin.

| Section | Screen Name | Screens Count |
| ----- | ----- | ----- |
| Partner Side | Certification Upload Page, Validation Errors Modal, Success Toast | 3 |
| Admin Side | Certification Review Table, View Batch Details, Approve/Reject Certification | 3 |
| SEIF View | Certification Summary Dashboard | 1 |
| **Subtotal (Certification Flow)** |  | **7 Screens** |

### **E. Partner Data Upload Flow & Notification operation**

**Goal:** Unified certification upload, validation, and download process for both Partner and Admin.

| Section | Screen Name | Screens Count |
| ----- | ----- | ----- |
| Partner Side | Partner dashboard \- partner uploads data \- notification goes to admin \- if rejected view remark and send for correction \- rejection notification comes to partner \- view remark and edit | 6 |
| Admin Side | Admin dashboard \- notification \- Notification comes to admin \- view data \- Approve or reject \- if approved goes to master sheet \- Edit data \- Edit and give remark on the table and mention partner | 6 |
| SEIF View | View only access same as admin | 4 |
| **Subtotal (Certification Flow)** |  | **16 Screens** |

### **F. Refurbishment Flow (Admin & Partner)**

**Goal:** Unified refurbishment process for both Partner and Admin.

| Section | Screen Name | Screens Count |
| ----- | ----- | ----- |
| Partner Side | Partner dashboard \- notification \- open link \- form flow ( Ask option for refurbishment and upgradation \- show predefined packages by admin \- partner selects multiple choice options \- justification and picture upload \- send for review) \- manual request \- past request | 10 |
| Admin Side | Admin dashboard \- refurbishment page \- key metrics (Eligible and refurbished centers) \- Table view with filters for all data, eligible and refurbished center, send manual request for refurbishment, past requests | 6 |
| SEIF View | View only access same as admin | 6 |
| **Subtotal (Certification Flow)** |  | **22 Screens** |

## **4 Week Plan towards completion**

### **Week 1 \- Core Foundation & Partner Flow (20–22 screens)**

Goal: Establish the core design system, navigation model, and partner-facing modules.

#### **Deliverables**

**🔹 Setup & Foundation**

* Design system: color palette, typography, grid, form styles, table components, icons, status states, toasts.

* Component library setup in Figma.

**🔹 Partner Dashboard (Primary focus)**

* Login & Access (2)

* Dashboard Home Overview (1)

* Data Upload (4)

* Data Management Views (2)

* Inbox (Alerts \+ Requests \+ Form \+ Past Requests) (4)

* Profile (View, Edit, Access) (3)

* Certification Module (Upload \+ Status \+ Download) (3)

###  **Week 2  \- Admin Dashboard Core & Notification System (22–24 screens)**

Goal: Create Admin interface for data operations, inbox management, and certification control.

#### **Deliverables**

**🔹 Admin Dashboard**

* Login & Home Overview (2)

* Data Management (Partner List, Partner Detail, Centers Table, Data Table, Edit Modal) (5)

* Inbox (Alerts, Requests, Past Requests, View Details) (4)

* User Management (2)

* Certification Management (3)

* Profile (2)

**🔹 Partner Data Upload & Notification Flow**

* Partner Side (6)

* Admin Side (6)

**Week 3 \- Refurbishment & Certification Flows (26–28 screens)**

*Goal: Build both refurbishment and certification flows for partner and admin, finalize approval/review UX.*

#### **Deliverables**

**🔹 Refurbishment Flow**

* Partner: Form Flow (refurbishment \+ upgradation options, predefined packages, photo upload, justification), Manual Request, Past Request (10)

* Admin: Refurbishment Dashboard (key metrics, table with filters, eligibility overview, manual trigger, past requests) (6)

* SEIF View: Read-only dashboards (6)

**🔹 Certification Upload & Review**

* Partner: Upload, Validation, Success (3)

* Admin: Review Table, Approve/Reject Modal, Download Summary (3)

* SEIF: Certification Overview Dashboard (1)

### **Week 4 \- SEIF View, QA, and Handoff (20–22 screens)**

*Goal: Finalize SEIF HQ view, polish UX details, and prepare dev-ready documentation.*

#### **Deliverables**

**🔹 SEIF Dashboard (Super Admin / Read-Only)**

* Login (1)

* Dashboard Overview (1)

* Reporting Filters \+ Export (2)

* Partner Insights (2)

* Certification Summary View (1)  
 


