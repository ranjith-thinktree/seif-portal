# SEIF Portal — Project Instructions

This document translates the `SEIF Portal Timeline.md` into a concrete implementation and delivery plan, including setup, architecture, week-by-week milestones, acceptance criteria, testing, deployment, and next steps.

## Quick overview / purpose

- Project: SEIF Portal (Partner, Admin, SEIF HQ views, ESSCI) for data upload, refurbishment requests, approvals, notifications, and reporting.
- Source reference: `SEIF Portal Timeline.md`.
- Goal: Deliver a production-ready web portal with Partner and Admin feature sets and SEIF read-only analytics view.

## Assumptions (inferred)

- This will be a web application (responsive) accessed by Partners, Admins, and SEIF team (read-only).
- Authentication and role-based access control (RBAC) is required (Partner, Admin, SEIF, SuperAdmin).
- File uploads (CSV for center/batch/student data, images for refurbishment) must be validated and stored reliably (object storage).
- Data volumes moderate;
- Notifications: in-app; push optional.

## High-level tech stack (recommended)

- Frontend: React (JavaScript) + Tailwind CSS, Vite or Create React App (CRA). You can add a UI kit later (MUI / Chakra / Headless UI) when you decide.
- Design: Figma for components and design system.
- Backend: Node.js (JavaScript). Framework: Express (recommended) or Fastify/Koa depending on preference for performance.
- Database: MySQL (per your update). Use a managed MySQL (RDS/Azure Database) if possible for backups and scaling.
- File storage: AWS S3 (or Azure Blob) for uploads
- Background jobs: Redis + BullMQ (or a simple queue) for background processing (notifications delivered in-app only)
- Auth: JWT with refresh tokens or Auth0 / Azure AD if corporate SSO required
- CI/CD: GitHub Actions; deploy to Vercel (frontend) and DigitalOcean / AWS ECS / Azure App Service (backend)
- Monitoring: Sentry for errors, Prometheus + Grafana or hosted monitoring

## Minimal repository layout (suggested)

- /frontend — React (JavaScript) app using Tailwind CSS
- /backend — Node.js (JavaScript) app (Express / Fastify)
- /infra — IaC (Terraform or ARM / CloudFormation), deployment manifests
- /design — Figma links, component library tokens exported
- README.md, CONTRIBUTING.md, SECURITY.md

## Data model (schema derived from `db.sql`)

The project database schema is defined in `db.sql`. Below is a concise, implementable summary of each table, important columns, relationships, and indexing notes. The provided SQL uses Postgres-style types and functions (uuid defaults, jsonb). Since your target DB is MySQL, a small migration/conversion will be required (notes below).

- users

  - Primary key: `id` (UUID)
  - Fields: `email` (unique), `password_hash`, `full_name`, `mobile_number`, `role` (SUPER_ADMIN, ADMIN, PARTNER, SEIF_READONLY, ESSCI), `partner_id` (FK), `status`, `last_login_at`, `created_at`, `updated_at`
  - Indexes: email, role, partner_id

- password_resets

  - Fields: `id`, `user_id` (FK users), `token` (unique), `expires_at`, `used_at`, `created_at`

- partners

  - Fields: `id`, `name`, `organization_type`, contact fields, address fields, `country` (default 'India'), `status`, `registration_date`, timestamps
  - Indexes: name, status

- courses

  - Lookup table: `course_name`, `course_code`, `description`, `duration_months`, `is_active`, timestamps
  - Indexes: course_name, course_code

- centers

  - Approved centers. Key fields: `id`, `partner_id` (FK), `center_name`, `center_type`, `region`, `city`, `state`, `address`, geolocation (`latitude`, `longitude`), `refurbishment_eligible`, `last_refurbishment_date`, `refurbishment_frequency_months` (0=immediate/ongoing, 6=6 months, 12=1 year, 24=2 years, etc.), timestamps
  - Indexes: partner_id, center_type, region, state, status
  - Eligibility calculation: Center is eligible for refurbishment when `(CURRENT_DATE - last_refurbishment_date) >= refurbishment_frequency_months` OR for new centers `(CURRENT_DATE - year_of_establishment) >= refurbishment_frequency_months`. Background job checks daily and creates notifications for admin.

- center_courses

  - Many-to-many link for centers and courses. Unique constraint on (center_id, course_id)

- batches

  - Approved batches: `center_id`, `partner_id`, `batch_number`, start/complete dates, student counts, status, timestamps

- data_uploads

  - Staging uploads from partners: `partner_id`, `upload_type`, `file_url`, `file_name`, `total_records`, `status` (pending/approved/rejected/partial), `uploaded_by`, `reviewed_by`, `rejection_reason`, `remarks`, timestamps

- uploaded_centers / uploaded_batches / uploaded_students

  - Staging tables for uploaded centers, batches, and student records pending approval. Partners upload ONE CSV per center containing center, batch, and all student details. Include `approval_status`, `rejection_reason`, `remarks`, and links to approved records after approval (`approved_center_id`, `approved_batch_id`, `approved_student_id`).

- requests

  - Generic requests (upload_request, refurbishment, upgradation, data_correction, support): `request_number` (unique), `type`, `partner_id`, `center_id`, `title`, `description`, `priority`, `status`, `created_by`, `assigned_to`, `reviewed_by`, timestamps

- scheduled_requests

  - For admin-scheduled upload requests: `request_id` (FK), `recurrence_type` (immediate/monthly/quarterly/semi_annual/annual/custom), `start_date`, `end_date`, `next_scheduled_date`, `last_executed_at`, `is_active`, timestamps. Background scheduler checks this table daily and sends notifications for due requests.

- refurbishment_requests

  - One-to-one with `requests` (via `request_id`), plus `refurbishment_type`, `estimated_cost`, `approved_cost`, `justification`, timestamps

- refurbishment_packages

  - Predefined packages (category, description, is_active, display_order)

- course_packages

  - Many-to-many link table between `courses` and `refurbishment_packages`. Fields: `id`, `course_id` (FK), `package_id` (FK). This defines which packages are available for which courses.

- refurbishment_request_packages (DEPRECATED - replaced by course-based tables below)

  - Old link table between refurbishment requests and packages with `quantity` and `notes`

- refurbishment_admin_selected_packages

  - When admin creates a refurbishment request, admin pre-selects packages from `course_packages` for each course. Partner can only select from these pre-selected packages. Fields: `id`, `refurbishment_request_id` (FK), `course_id` (FK), `package_id` (FK), `created_at`

- refurbishment_request_course_packages

  - Partner's final package selections per course with justification. Fields: `id`, `refurbishment_request_id` (FK), `course_id` (FK), `package_id` (FK), `partner_justification` (text), `created_at`

- refurbishment_request_course_attachments

  - Photos uploaded by partner per course showing current conditions. Fields: `id`, `refurbishment_request_id` (FK), `course_id` (FK), `file_url`, `file_name`, `file_size_bytes`, `file_mime_type`, `uploaded_by` (FK users), `created_at`

- refurbishment_upgradation_rooms

  - Optional room upgradation request. Fields: `id`, `refurbishment_request_id` (FK), `length` (decimal feet), `breadth` (decimal feet), `height` (decimal feet), `justification` (text), `created_at`. Schema supports multiple rooms (future extensibility), but UI allows only one room per request currently.

- refurbishment_upgradation_photos

  - Photos for room upgradation. Fields: `id`, `refurbishment_request_id` (FK), `file_url`, `file_name`, `file_size_bytes`, `file_mime_type`, `uploaded_by` (FK users), `created_at`

- request_attachments

  - Attachments linked to `requests`: `file_url`, `file_name`, `file_size_bytes`, `file_mime_type`, `uploaded_by`, timestamp

- request_comments

  - Comments on requests. `is_internal` flag for admin-only comments.

- notifications

  - In-app notifications table: `recipient_id` or `recipient_role` (used for role broadcasts), `type`, `alert_type` (refurbishment, data_approval, data_reject, upload_request - used in Alerts tab), `title`, `message`, `remark` (additional remarks/description from admin shown in alerts), `payload` (JSON), `related_entity_type`, `related_entity_id`, `is_read`, `read_at`, `sent_via` (default `in_app`), `email_sent_at`, timestamps
  - Indexes: recipient_id, recipient_role, is_read, type, alert_type, created_at
  - Partner inbox "Alerts" tab shows: Date (created_at), Type (alert_type), Title, Remark, Status (from related request), Action (View button)
  - Note: The SQL includes `sent_via` and `email_sent_at` columns (Postgres schema). Project decision earlier: deliver notifications in-app only. Keep these columns if you want to preserve the option later, but the application will only write/read via the `in_app` flow.

- download_logs

  - For ESSCI users' exports: `user_id`, `download_type`, `partner_id`, `center_id`, `file_name`, `record_count`, `filters` (JSON), timestamps

- audit_logs
  - Activity audit trail: `user_id`, `action`, `entity_type`, `entity_id`, `changes` (JSON), `ip_address`, `user_agent`, timestamps

Schema implementation notes (MySQL)

- The provided `db.sql` uses Postgres-specific features: `gen_random_uuid()`, `jsonb`, and `payload jsonb`. For MySQL you should convert:
  - UUIDs: use `CHAR(36)` or `BINARY(16)` to store UUIDs and use MySQL's `UUID()` as default, or generate UUIDs in the application layer.
  - JSONB / jsonb: use MySQL `JSON` column type (available in MySQL 5.7+). Note differences in indexing and operators.
  - `timestamp` defaults: replace `now()` with `CURRENT_TIMESTAMP` and use `ON UPDATE CURRENT_TIMESTAMP` for updated_at if needed.
  - `gen_random_uuid()` -> `UUID()` or generate in Node.js (recommended when using ORMs).

Indexes & performance

- Keep the same functional indexes (email, role, partner_id, request_number unique, (center_id, course_id) unique on `center_courses`, and others listed in the schema). Add composite indexes on frequent query patterns (e.g., (partner_id, status) on `data_uploads`), and consider covering indexes for heavy read queries.

Migrations and ORM guidance

- Recommended approach for Node.js (JavaScript) + MySQL:
  - Use Knex.js as a migration tool / query builder, or Sequelize for a higher-level ORM with migration support.
  - Create migration scripts that create each table using MySQL-compatible types. Keep FK constraints and indexes.
  - Seed initial lookup data: `refurbishment_packages`, `courses`, and any admin user.

Acceptance criteria for DB

- Migration scripts exist and run against a MySQL staging instance creating the full schema.
- Sample seed data for `partners`, `courses`, and one `admin` user is present.
- Queries for critical flows (partner upload, admin review, notifications list) are validated against the schema and indexed for performance.

## Authentication & Authorization

- Implement RBAC with roles: PARTNER, ADMIN, SEIF_READONLY, SUPER_ADMIN.
- Protect endpoints and UI routes by role.
- Login flows: email/password + reset password; consider 2FA for Admin/SuperAdmin.

## Uploads & validation

- Partner uploads ONE CSV file per center containing center details, batch info, and all student records.
- Client-side pre-validation (file type CSV, size) and preview.
- Backend validation pipeline: file-type check, store CSV to S3, parse CSV in background worker, create rows in `uploaded_centers`, `uploaded_batches`, and `uploaded_students` (one row per student in CSV).
- Admin reviews the ENTIRE upload (not individual rows) and approves or rejects everything at once with detailed rejection reason and remarks.
- If rejected, partner modifies the CSV and re-uploads using the same upload record (status updated).

## Notifications & Inbox

- In-app notifications only: use a notification table for Admin and Partner inboxes and a real-time in-app delivery mechanism (WebSockets or Server-Sent Events).
- No email notifications will be sent; all user-facing alerts and request updates are delivered inside the application.
- Notification structure: id, recipient_id (user or role), type, payload (json), read, created_at.

## API design (high level)

- REST endpoints for CRUD on Partner, Center, Batch, Student, Requests (upload_request, refurbishment, data_correction, support).
- Auth endpoints: /auth/login, /auth/refresh, /auth/reset
- Upload endpoints: /uploads/init (signed URL for CSV), /uploads/complete (trigger background processing)
- Admin upload review: /admin/uploads (list), /admin/uploads/:id/details (get full upload), /admin/uploads/:id/approve, /admin/uploads/:id/reject
- Admin request scheduling: /admin/requests/upload (create scheduled upload request), /admin/requests/scheduled (list)
- Refurbishment endpoints (Admin):
  - GET /admin/refurbishment/eligible-centers (eligibility calculation)
  - GET /admin/refurbishment/requests?status=active|past
  - POST /admin/refurbishment/create-request (center, courses, pre-selected packages per course, remarks)
  - GET /admin/refurbishment/:requestId/review (full submission with course packages, attachments, upgradation)
  - POST /admin/refurbishment/:requestId/review (change status to in_review)
  - POST /admin/refurbishment/:requestId/approve (approve with admin remarks)
  - POST /admin/refurbishment/:requestId/reject (reject with reason and remarks)
- Refurbishment endpoints (Partner):
  - GET /partner/inbox/alerts (Date/Type/Title/Remark/Status/Action)
  - GET /partner/refurbishment/:requestId/details (center details, courses, admin pre-selected packages per course)
  - POST /partner/refurbishment/:requestId/submit (courses with selected packages/justification/photos, optional upgradation with dimensions/photos)
- Notification endpoints: /notifications, /notifications/mark-read

## UX & Component library

- Create tokens (colors, typography, spacing) from the design system in `Week 1`.
- Build reusable components: Form, Table with filters/pagination/sorting, Modal, FileUploader, Toast, NotificationList.
- Accessibility: keyboard navigation, ARIA attributes for forms and table components.

## Week-by-week breakdown (mapped to your timeline)

Each weekly milestone includes acceptance criteria (AC) so work can be validated quickly.

Week 1 — Core Foundation & Partner Flow (matching Timeline week 1)

- Tasks:
  - Create repo skeleton (`frontend`, `backend`, `design`).
  - Setup CI (basic lint/test flow) and branch rules.
  - Implement design system tokens in Figma + component library scaffolding in `frontend`.
  - Auth scaffold (login, password reset).
  - Partner pages: Dashboard overview, Data Upload form (center name, batch details, CSV upload), Data Management (tables + filters), Inbox (alerts + requests + raise request), Profile (view/edit).
  - Background worker scaffold for parsing uploaded CSV and creating `uploaded_centers`, `uploaded_batches`, `uploaded_students`.
- Acceptance criteria:
  - Components and design tokens available in the library.
  - Partner can login, upload a CSV file with center/batch/student data, and see success UI (mock backend OK).
  - Data tables show mock rows and support filtering and sorting.

Week 2 — Admin Dashboard Core & Notification System

- Tasks:
  - Admin login and admin dashboard overview (stats, geographic view placeholder).
  - Data Management pages (partner list, partner detail, centers table, review modals).
  - Admin upload review UI: list pending uploads, view full upload details (center, batch, all students), approve/reject entire upload with rejection reason and remarks.
  - Admin request scheduling feature: form to request partner to upload data with recurrence options (immediate, monthly, quarterly, semi-annual, annual, custom date range).
  - Notifications plumbing (in-app list and delivery; real-time delivery via WebSocket/SSE or polling).
  - Background scheduler worker to check `scheduled_requests` table daily and send due notifications.
- Acceptance criteria:
  - Admin can view partner list, open partner detail and review pending uploads.
  - Admin can approve or reject entire upload; partner receives in-app notification with rejection details if rejected.
  - Admin can create scheduled upload requests; system sends them at specified intervals.

Week 3 — Refurbishment Flows (Course-Based) & Upload Re-submission

- Tasks:
  - Admin refurbishment dashboard with 3 tabs:
    - **Overview tab:** 3 sub-tabs (Eligible Centers with eligibility calculation, Last Refurbished, All Centers)
    - **Requests tab:** Active refurbishment requests list with "Create Refurbishment Request" button
    - **Past Requests tab:** Completed requests (approved/rejected) with details
  - Admin create refurbishment request flow: select center, select courses, pre-select packages from `course_packages` for each course, add remarks
  - Partner inbox "Alerts" tab showing Date, Type (alert_type), Title, Remark, Status, Action columns
  - Partner refurbishment request UI:
    - Center details header with admin remarks
    - Course-by-course tabs (Electrical, Solar, IA, etc.)
    - Per course: package selection (from admin pre-selected only), justification text area, photos upload
    - Optional upgradation section: checkbox, room dimensions (length/breadth/height), justification, photos
    - Preview screen showing all course selections in tabs
    - Submit button (status changes to 'partner_submitted')
  - Admin review refurbishment UI:
    - View partner submissions with course tabs
    - Each course shows selected packages, justification, photos
    - Upgradation section if requested
    - Approve with remarks or reject with reason
  - Partner re-upload flow: after rejection, partner modifies CSV and re-uploads (same upload record, updated status).
  - SEIF read-only pages scaffolding.
  - Background job: daily cron to check center eligibility and create admin notifications
- Acceptance criteria:
  - Admin can view eligible centers based on `refurbishment_frequency_months` calculation.
  - Admin can create refurbishment request by pre-selecting packages per course from `course_packages`.
  - Partner sees alert in inbox with Date/Type/Title/Remark/Status/Action columns.
  - Partner can select packages course-by-course with justification and photos, and optionally request room upgradation.
  - Partner can preview all selections before submit.
  - Admin can review course-by-course selections and approve/reject with detailed remarks.
  - Partner can see rejection details and re-upload corrected CSV; admin can re-review.

Week 4 — SEIF View, QA, and Handoff

- Tasks:
  - Finalize SEIF Dashboard (read-only aggregated stats, map, reports) and reporting/export endpoints.
  - Complete QA pass, accessibility checks and performance baseline.
  - Developer handoff docs, API specs, and test coverage targets.
  - Prepare deployment/infra (basic infra + CI/CD triggers) and run a staging deployment.
- Acceptance criteria:
  - SEIF users can view read-only dashboards and export simple reports.
  - Staging deployed, smoke-tested flows (Partner upload → Admin approval → Master sheet update).

## Testing and QA

- Unit tests: Jest for backend, Vitest or Jest for frontend.
- Integration tests: basic API route tests (supertest) and E2E smoke tests (Playwright or Cypress) for critical flows (login, upload, approve/reject, request flow).
- QA checklist:
  - Critical flows tested in staging (uploads, notifications, approvals).
  - Accessibility quick pass (axe or Lighthouse basis).
  - Load test for upload endpoints if expected high concurrency.

## CI / CD

- GitHub Actions pipeline with jobs:
  - lint
  - test
  - build (frontend)
  - deploy (staging on merge to `main` or a release tag)
- Use environment secrets for DB and S3.

## Security & privacy

- Ensure uploaded files are stored privately with signed URLs for downloads.
- Use HTTPS for all endpoints; enforce secure cookies / refresh token best practices.
- Limit file types and sizes; scan uploads if required.

## Acceptance criteria and definition of done (DoD)

- All screens specified for a flow are implemented and navigable.
- Backend endpoints supporting those flows are available and have test coverage.
- End-to-end tests for critical flows pass in CI.
- Staging deployment validated and accessible by QA.
- Documentation: API spec, runbook for deployments, and a short dev handoff.

## Risks and mitigations

- Risk: Upload scaling and validation bottlenecks. Mitigation: Use signed uploads to S3 + background processing.
- Risk: Notifications gap between partner and admin. Mitigation: Use idempotent message queue and audit logs for messages.
- Risk: Ambiguous fields in timeline. Mitigation: Create short discovery tickets for ambiguous items (e.g., master sheet schema, expected file formats).

## Practical checklist to start (first 2–3 days)

1. Create GitHub repo and add `README.md`, branch protection rules.
2. Initialize `frontend` and `backend` with JavaScript templates (React + Tailwind for frontend; Node + Express for backend). Add ESLint/Prettier and Husky pre-commit hooks.
3. Setup basic CI with lint and test jobs (GitHub Actions).
4. Create Figma component tokens and initial component library scaffolding.
5. Implement Auth skeleton and one end-to-end demo: Partner login → Upload center CSV → Background worker parses CSV → Mock in-app notification to admin.

## Developer tasks (granular tickets to create)

- Ticket A: Repo initialization, CI, and branch rules (JS templates)
- Ticket B: Design system tokens and component library (Figma + frontend)
- Ticket C: Auth + RBAC implementation (Node/Express + MySQL)
- Ticket D: Partner Dashboard — Data Upload form (center CSV upload) + Table views (React + Tailwind)
- Ticket E: Admin Dashboard — Partner List + Upload Review (entire upload approve/reject with reasons)
- Ticket F: Upload pipeline (S3 signed URL + background worker to parse CSV and create uploaded_centers/batches/students)
- Ticket G: Notification service (in-app only)
- Ticket H: Admin request scheduling feature (upload_request with recurrence) + background scheduler worker
- Ticket I: Refurbishment course-based flow (Admin 3-tab page, create request with course package pre-selection, Partner inbox Alerts tab, Partner course-by-course selection with justification and photos per course, optional upgradation with room dimensions and photos, Admin review with course tabs)
- Ticket J: Refurbishment eligibility background job (daily cron to check `refurbishment_frequency_months` and create admin notifications)
- Ticket K: SEIF read-only dashboards and reports
- Ticket L: End-to-end tests and staging deployment

## Deliverables I created for you

- `PROJECT_INSTRUCTIONS.md` (this file) — actionable implementation plan and checklist derived from `SEIF Portal Timeline.md`.

## Next steps (recommended)

1. Review this document and mark any clarifications directly in your issue tracker (or add comments in `SEIF Portal Timeline.md`).
2. Create the repository and open the first sprint (Week 1) tickets — prioritize Auth, design tokens, and partner upload flow.
3. Assign a developer for backend and frontend leads and schedule a short 1-hour kickoff to align expected file formats and master sheet schema.
4. Share this `PROJECT_INSTRUCTIONS.md` with your team and ask them to estimate the tickets.

---

If you want, I can now:

- Generate the repository skeleton (frontend + backend) with basic templates and CI.
- Create the suggested ticket list in a markdown checklist or in GitHub issues (requires repository access).
- Produce a minimal API spec (OpenAPI) for the critical endpoints.

Tell me which of the follow-ups you'd like me to do next and I will proceed.
