'use strict';

const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const notificationService = require('./notification.service');

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER: Create a certification upload record (form-based, no CSV rows)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} params
 * @param {string} params.partnerId
 * @param {string} params.centerId
 * @param {string|null} params.centerName
 * @param {string|null} params.batchId
 * @param {string|null} params.otherBatchNumber
 * @param {string|null} params.batchStartDate  YYYY-MM-DD
 * @param {string|null} params.batchEndDate    YYYY-MM-DD
 * @param {string|null} params.assessmentDate  YYYY-MM-DD
 * @param {string|null} params.spokeName
 * @param {string|null} params.spokeEmail
 * @param {string|null} params.spokeMobile
 * @param {string}      params.uploadedBy      user id
 */
const createCertificationUpload = async (params) => {
  const {
    partnerId,
    centerId,
    centerName,
    batchId,
    otherBatchNumber,
    batchStartDate,
    batchEndDate,
    assessmentDate,
    spokeName,
    spokeEmail,
    spokeMobile,
    uploadedBy,
  } = params;

  if (!batchId && !otherBatchNumber) {
    throw new Error('batchId or otherBatchNumber is required');
  }

  const uploadId = uuidv4();
  await db.query(
    `INSERT INTO certification_uploads
       (id, partner_id, center_id, center_name, batch_id, other_batch_number,
        batch_start_date, batch_end_date, assessment_date,
        spoke_name, spoke_email, spoke_mobile,
        status, uploaded_by, reviewed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, NOW(), NOW())`,
    [
      uploadId,
      partnerId,
      centerId,
      centerName || null,
      batchId || null,
      otherBatchNumber || null,
      batchStartDate || null,
      batchEndDate || null,
      assessmentDate || null,
      spokeName || null,
      spokeEmail || null,
      spokeMobile || null,
      uploadedBy,
    ]
  );

  // Notify ESSCI to process (no admin approval step)
  await db.query(
    `INSERT INTO notifications
       (id, recipient_role, type, alert_type, title, message,
        related_entity_type, related_entity_id, is_read, sent_via, created_at)
     VALUES (UUID(), 'ESSCI', 'certification_submitted', 'info',
       'New Certification Data Submitted',
       'A partner has submitted certification data for ESSCI processing.',
       'certification_upload', ?, 0, 'platform', NOW())`,
    [uploadId]
  );

  // Notify submitting partner
  await db.query(
    `INSERT INTO notifications
       (id, recipient_id, type, alert_type, title, message,
        related_entity_type, related_entity_id, is_read, sent_via, created_at)
     VALUES (UUID(), ?, 'certification_submitted', 'success',
       'Certification Data Submitted',
       'Your certification data has been submitted and is ready for ESSCI processing.',
       'certification_upload', ?, 0, 'platform', NOW())`,
    [uploadedBy, uploadId]
  );

  return { uploadId };
};

/**
 * Get a partner's certification upload history.
 */
const getPartnerUploads = async (partnerId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const safeLimit = parseInt(limit) || 10;
  const safeOffset = parseInt(offset);
  const [rows] = await db.query(
    `SELECT cu.*,
            COALESCE(c.center_name, cu.center_name) AS center_name,
            COALESCE(b.batch_number, cu.other_batch_number) AS batch_number
     FROM certification_uploads cu
     LEFT JOIN centers  c ON c.id = cu.center_id
     LEFT JOIN batches  b ON b.id = cu.batch_id
     WHERE cu.partner_id = ?
     ORDER BY cu.created_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [partnerId]
  );
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) as total FROM certification_uploads WHERE partner_id = ?',
    [partnerId]
  );
  return { uploads: rows, total, page: parseInt(page), limit: parseInt(limit) };
};

const CERTIFICATION_DERIVED_STATUS_LABELS = {
  ongoing: 'Ongoing',
  under_review: 'Under review',
  done: 'Done',
  pending_admin: 'Pending Admin Review',
  rejected: 'Rejected',
};

const parseCertificationFilesJson = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildStep1DetailSummary = (upload) =>
  [
    upload.essci_response_link ? `Link: ${upload.essci_response_link}` : null,
    upload.essci_response_id ? `ID: ${upload.essci_response_id}` : null,
    upload.essci_qr_code_name ? `QR: ${upload.essci_qr_code_name}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Build a multi-step status timeline for certification requests (reuse on frontend).
 * @param {Object} upload - certification_uploads row (+ joined display fields)
 * @param {Object|null} pdf - latest certification_pdfs row for this batch/partner
 */
const buildCertificationStatusTimeline = (upload, pdf = null) => {
  if (!upload) {
    return { current_status: null, current_status_label: null, events: [] };
  }

  const events = [];
  const addEvent = (event) => {
    if (!event) return;
    if (event.requireDate && !event.occurred_at) return;
    events.push(event);
  };

  addEvent({
    key: 'submitted',
    status: 'submitted',
    label: 'Partner Submitted Certification Data',
    occurred_at: upload.created_at,
    detail: null,
  });

  if (upload.status === 'pending') {
    addEvent({
      key: 'admin_review_pending',
      status: 'pending',
      label: 'Awaiting Admin Approval',
      occurred_at: null,
      detail: 'Admin is reviewing the partner submission.',
      requireDate: false,
    });
  } else if (upload.status === 'rejected') {
    addEvent({
      key: 'admin_rejected',
      status: 'rejected',
      label: 'Admin Rejected Submission',
      occurred_at: upload.reviewed_at,
      detail: upload.rejection_reason || upload.remarks || null,
    });
  } else if (upload.status === 'approved') {
    addEvent({
      key: 'ready_for_essci',
      status: 'approved',
      label: 'Ready for ESSCI Processing',
      occurred_at: upload.reviewed_at || upload.created_at,
      detail: null,
    });

    const hasStep1 = Boolean(upload.essci_step1_at);

    if (!hasStep1) {
      addEvent({
        key: 'essci_step1_pending',
        status: 'ongoing',
        label: 'Awaiting ESSCI Initial Response',
        occurred_at: null,
        detail: 'Upload QR code and share assessment link, ID, and password.',
        requireDate: false,
      });
    } else {
      addEvent({
        key: 'essci_step1_submitted',
        status: 'step1_done',
        label: 'ESSCI Initial Response Submitted',
        occurred_at: upload.essci_step1_at,
        detail: [
          upload.essci_response_link ? `Link: ${upload.essci_response_link}` : null,
          upload.essci_response_id ? `ID: ${upload.essci_response_id}` : null,
          upload.essci_qr_code_name ? `QR: ${upload.essci_qr_code_name}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Shared with center spoke person.',
      });

      if (!pdf) {
        addEvent({
          key: 'essci_step2_pending',
          status: 'ongoing',
          label: 'Awaiting Assessment Results & Certificates',
          occurred_at: null,
          detail:
            'Enter registered, attended, passed, and failed counts, then upload final certification documents.',
          requireDate: false,
        });
      }
    }

    if (pdf) {
      addEvent({
        key: 'pdf_uploaded',
        status: 'pdf_uploaded',
        label: 'ESSCI Uploaded Final Certificates',
        occurred_at: pdf.created_at,
        detail: [
          pdf.trainees_registered != null ? `Registered: ${pdf.trainees_registered}` : null,
          pdf.trainees_attended != null ? `Attended: ${pdf.trainees_attended}` : null,
          pdf.trainees_passed != null ? `Passed: ${pdf.trainees_passed}` : null,
          pdf.trainees_failed != null ? `Failed: ${pdf.trainees_failed}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || null,
      });

      if (pdf.status === 'approved') {
        addEvent({
          key: 'pdf_approved',
          status: 'done',
          label: 'Certificates Ready',
          occurred_at: pdf.reviewed_at || pdf.created_at,
          detail: pdf.remarks || null,
        });
      } else if (pdf.status === 'pending') {
        addEvent({
          key: 'pdf_under_review',
          status: 'under_review',
          label: 'PDF Under Admin Review',
          occurred_at: pdf.created_at,
          detail: 'Admin is reviewing the uploaded certificate package.',
          requireDate: false,
        });
      } else if (pdf.status === 'rejected') {
        addEvent({
          key: 'pdf_rejected',
          status: 'pdf_rejected',
          label: 'Certificate Upload Rejected',
          occurred_at: pdf.reviewed_at,
          detail: pdf.rejection_reason || pdf.remarks || null,
        });
        addEvent({
          key: 'essci_reupload_pending',
          status: 'ongoing',
          label: 'Awaiting ESSCI Re-upload',
          occurred_at: null,
          detail: 'Please upload revised assessment results and certificate documents.',
          requireDate: false,
        });
      }
    }
  }

  let currentKey = 'submitted';
  let currentLabel = CERTIFICATION_DERIVED_STATUS_LABELS.pending_admin;

  if (upload.status === 'pending') {
    currentKey = 'admin_review_pending';
    currentLabel = CERTIFICATION_DERIVED_STATUS_LABELS.pending_admin;
  } else if (upload.status === 'rejected') {
    currentKey = 'admin_rejected';
    currentLabel = CERTIFICATION_DERIVED_STATUS_LABELS.rejected;
  } else if (upload.status === 'approved') {
    if (!upload.essci_step1_at) {
      currentKey = 'essci_step1_pending';
      currentLabel = CERTIFICATION_DERIVED_STATUS_LABELS.ongoing;
    } else if (!pdf || pdf.status === 'rejected') {
      currentKey = pdf?.status === 'rejected' ? 'essci_reupload_pending' : 'essci_step2_pending';
      currentLabel = CERTIFICATION_DERIVED_STATUS_LABELS.ongoing;
    } else if (pdf.status === 'pending') {
      currentKey = 'pdf_under_review';
      currentLabel = CERTIFICATION_DERIVED_STATUS_LABELS.under_review;
    } else if (pdf.status === 'approved') {
      currentKey = 'pdf_approved';
      currentLabel = CERTIFICATION_DERIVED_STATUS_LABELS.done;
    } else {
      currentKey = 'essci_step2_pending';
      currentLabel = CERTIFICATION_DERIVED_STATUS_LABELS.ongoing;
    }
  }

  events.forEach((event) => {
    event.is_current = event.key === currentKey;
    event.is_latest = false;
  });

  if (events.length > 0 && !events.some((e) => e.is_current)) {
    const last = events[events.length - 1];
    last.is_current = true;
    currentKey = last.key;
    currentLabel = last.label;
  }

  if (events.length > 0) {
    events[events.length - 1].is_latest = true;
  }

  return {
    current_status: currentKey,
    current_status_label: currentLabel,
    derived_status: currentLabel,
    events,
  };
};

/**
 * Get one upload + associated students from the students table.
 */
const getUploadDetails = async (uploadId, partnerId = null) => {
  const whereExtra = partnerId ? 'AND cu.partner_id = ?' : '';
  const params = partnerId ? [uploadId, partnerId] : [uploadId];

  const [[upload]] = await db.query(
    `SELECT cu.*,
            COALESCE(c.center_name, cu.center_name) AS center_name,
            COALESCE(b.batch_number, cu.other_batch_number) AS batch_number,
       cu.reviewed_at AS updated_at,
            p.name as partner_name,
            p.organization_type as partner_type,
            cp.id AS pdf_id,
            cp.status AS pdf_status,
            cp.trainees_attended,
            cp.trainees_passed,
            cp.trainees_failed,
            cp.trainees_absent,
            cp.trainees_registered,
            cp.zip_file_url,
            cp.zip_file_name,
            cp.student_list_url,
            cp.student_list_name,
            cp.certification_files_json,
            cp.created_at AS pdf_created_at,
            cp.reviewed_at AS pdf_reviewed_at,
            cp.remarks AS pdf_remarks,
            cp.rejection_reason AS pdf_rejection_reason
     FROM certification_uploads cu
     LEFT JOIN centers  c ON c.id = cu.center_id
     LEFT JOIN batches  b ON b.id = cu.batch_id
     LEFT JOIN partners p ON p.id = cu.partner_id
     LEFT JOIN certification_pdfs cp ON cp.id = (
       SELECT cp2.id
       FROM certification_pdfs cp2
       WHERE cp2.certification_upload_id = cu.id
          OR (cp2.certification_upload_id IS NULL
              AND cu.batch_id IS NOT NULL
              AND cp2.batch_id = cu.batch_id
              AND cp2.partner_id = cu.partner_id)
       ORDER BY cp2.created_at DESC
       LIMIT 1
     )
     WHERE cu.id = ? ${whereExtra}`,
    params
  );
  if (!upload) return null;

  const pdf =
    upload.pdf_id != null
      ? {
          id: upload.pdf_id,
          status: upload.pdf_status,
          trainees_registered: upload.trainees_registered,
          trainees_attended: upload.trainees_attended,
          trainees_passed: upload.trainees_passed,
          trainees_failed: upload.trainees_failed,
          trainees_absent: upload.trainees_absent,
          zip_file_url: upload.zip_file_url,
          zip_file_name: upload.zip_file_name,
          student_list_url: upload.student_list_url,
          student_list_name: upload.student_list_name,
          certification_files: parseCertificationFilesJson(upload.certification_files_json),
          created_at: upload.pdf_created_at,
          reviewed_at: upload.pdf_reviewed_at,
          remarks: upload.pdf_remarks,
          rejection_reason: upload.pdf_rejection_reason,
        }
      : null;

  const statusTimeline = buildCertificationStatusTimeline(upload, pdf);

  // Fetch students for this batch from the main students table.
  const [students] = upload.batch_id
    ? await db.query(
        `SELECT id, student_name AS trainee_name, partner_student_id AS student_id, gender
         FROM students
         WHERE batch_id = ?
         ORDER BY student_name`,
        [upload.batch_id]
      )
    : [[]];

  return {
    ...upload,
    pdf,
    status_timeline: statusTimeline,
    derived_status: statusTimeline.derived_status,
    students,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Approve / Reject certification upload
// ─────────────────────────────────────────────────────────────────────────────

const approveCertificationUpload = async (uploadId, adminId, remarks = null) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE certification_uploads
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), remarks = ?
       WHERE id = ?`,
      [adminId, remarks, uploadId]
    );

    // Notify the uploading partner
    const [[upload]] = await connection.query(
      'SELECT uploaded_by, partner_id FROM certification_uploads WHERE id = ?',
      [uploadId]
    );
    if (upload) {
      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certification_approved', 'success',
           'Certification Data Approved',
           'Your certification data upload has been approved by the admin.',
           'certification_upload', ?, 0, 'platform', NOW())`,
        [upload.uploaded_by, uploadId]
      );
      // Also notify ESSCI role
      await connection.query(
        `INSERT INTO notifications
           (id, recipient_role, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), 'ESSCI', 'certification_approved', 'info',
           'New Certification Data Ready',
           'A partner certification upload has been approved and is ready for you to process.',
           'certification_upload', ?, 0, 'platform', NOW())`,
        [uploadId]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const rejectCertificationUpload = async (uploadId, adminId, rejectionReason, remarks = null) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE certification_uploads
       SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
           rejection_reason = ?, remarks = ?
       WHERE id = ?`,
      [adminId, rejectionReason, remarks, uploadId]
    );

    const [[upload]] = await connection.query(
      'SELECT uploaded_by FROM certification_uploads WHERE id = ?',
      [uploadId]
    );
    if (upload) {
      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message, remark,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certification_rejected', 'error',
           'Certification Data Rejected',
           'Your certification data upload has been rejected.',
           ?,
           'certification_upload', ?, 0, 'platform', NOW())`,
        [upload.uploaded_by, rejectionReason, uploadId]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Admin: list all certification uploads with optional status filter.
 */
const getAllCertificationUploads = async ({ status, page = 1, limit = 20, search } = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('cu.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push(
      '(p.name LIKE ? OR c.center_name LIKE ? OR b.batch_number LIKE ? OR cu.other_batch_number LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const safeLimit2 = parseInt(limit) || 20;
  const safeOffset2 = parseInt(offset);
  const [uploads] = await db.query(
    `SELECT cu.*,
            p.name      as partner_name,
            COALESCE(c.center_name, cu.center_name) AS center_name,
            COALESCE(b.batch_number, cu.other_batch_number) AS batch_number
     FROM certification_uploads cu
     LEFT JOIN partners p ON p.id = cu.partner_id
     LEFT JOIN centers  c ON c.id = cu.center_id
     LEFT JOIN batches  b ON b.id = cu.batch_id
     ${where}
     ORDER BY cu.created_at DESC
     LIMIT ${safeLimit2} OFFSET ${safeOffset2}`,
    params
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) as total
     FROM certification_uploads cu
     LEFT JOIN partners p ON p.id = cu.partner_id
     LEFT JOIN centers  c ON c.id = cu.center_id
     LEFT JOIN batches  b ON b.id = cu.batch_id
     ${where}`,
    params
  );

  return { uploads, total, page: parseInt(page), limit: parseInt(limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// ESSCI: Data page — approved uploads with derived certification status
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all approved certification_uploads with a derived status:
 *   - No PDF uploaded yet  → "Ongoing"
 *   - Has PDF, pending admin review → "Under review"
 *   - Has PDF, admin approved → "Done"
 */
const getESSCIData = async ({ page = 1, limit = 20, search, filter } = {}) => {
  const offset = (page - 1) * limit;
  const baseConditions = ["cu.status = 'approved'"];
  const params = [];

  if (search) {
    baseConditions.push(
      '(p.name LIKE ? OR c.center_name LIKE ? OR cu.center_name LIKE ? OR b.batch_number LIKE ? OR cu.other_batch_number LIKE ?)'
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Translate derived_status filter into concrete WHERE conditions on cp columns
  // so the same condition can be applied to both the data query and the count query.
  let filterCondition = '';
  if (filter && filter !== 'all') {
    if (filter === 'done') filterCondition = "AND cp.status = 'approved'";
    if (filter === 'under_review') filterCondition = "AND cp.status = 'pending'";
    // 'ongoing' = no PDF uploaded yet, or previously rejected PDF
    if (filter === 'ongoing')
      filterCondition = "AND (cp.id IS NULL OR cp.status NOT IN ('pending', 'approved'))";
  }

  const where = `WHERE ${baseConditions.join(' AND ')}`;

  const safeLimit3 = parseInt(limit) || 20;
  const safeOffset3 = parseInt(offset);
  const [rows] = await db.query(
    `SELECT
       cu.id,
       cu.partner_id,
       cu.center_id,
       cu.batch_id,
       cu.batch_start_date,
       cu.batch_end_date,
       cu.assessment_date,
       cu.support_doc_url,
       cu.support_doc_name,
       cu.other_batch_number,
       cu.spoke_name,
       cu.spoke_email,
       cu.spoke_mobile,
       cu.reviewed_at,
       cu.remarks,
       cu.rejection_reason,
       cu.created_at,
       p.name      as partner_name,
       p.organization_type as partner_type,
       c.center_name,
       COALESCE(b.batch_number, cu.other_batch_number) AS batch_number,
       cu.reviewed_at AS updated_at,
       cp.id       as pdf_id,
       cp.status   as pdf_status,
       cp.trainees_attended,
       cp.trainees_passed,
       cp.trainees_failed,
       cp.trainees_absent,
       CASE
         WHEN cp.id IS NULL            THEN 'Ongoing'
         WHEN cp.status = 'pending'    THEN 'Under review'
         WHEN cp.status = 'approved'   THEN 'Done'
         ELSE 'Ongoing'
       END as derived_status
     FROM certification_uploads cu
     LEFT JOIN partners p ON p.id = cu.partner_id
     LEFT JOIN centers  c ON c.id = cu.center_id
     LEFT JOIN batches  b ON b.id = cu.batch_id
     LEFT JOIN certification_pdfs cp ON cp.id = (
       SELECT cp2.id
       FROM certification_pdfs cp2
       WHERE cp2.certification_upload_id = cu.id
          OR (cp2.certification_upload_id IS NULL
              AND cu.batch_id IS NOT NULL
              AND cp2.batch_id = cu.batch_id
              AND cp2.partner_id = cu.partner_id)
       ORDER BY cp2.created_at DESC
       LIMIT 1
     )
     ${where}
     ${filterCondition}
     ORDER BY cu.created_at DESC
     LIMIT ${safeLimit3} OFFSET ${safeOffset3}`,
    params
  );

  // Stats (always across all approved, unaffected by filter)
  const [[stats]] = await db.query(
    `SELECT
       COUNT(DISTINCT cu.partner_id)  as total_partners,
       COUNT(DISTINCT cu.center_id)   as total_centers,
       (SELECT COUNT(*) FROM students s
        JOIN batches   bx ON bx.id = s.batch_id
        JOIN certification_uploads cu2 ON cu2.batch_id = bx.id AND cu2.status = 'approved'
        ) as total_students,
       (SELECT COUNT(*) FROM students s
        JOIN batches   bx ON bx.id = s.batch_id
        JOIN certification_uploads cu2 ON cu2.batch_id = bx.id AND cu2.status = 'approved'
        WHERE (s.gender = 'Female' OR s.gender = 'female')) as female_trainees
     FROM certification_uploads cu
     WHERE cu.status = 'approved'`
  );

  // Count respects both search and filter conditions for correct pagination
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) as total
     FROM certification_uploads cu
     LEFT JOIN partners p ON p.id = cu.partner_id
     LEFT JOIN centers  c ON c.id = cu.center_id
     LEFT JOIN batches  b ON b.id = cu.batch_id
     LEFT JOIN certification_pdfs cp ON cp.id = (
       SELECT cp2.id
       FROM certification_pdfs cp2
       WHERE cp2.certification_upload_id = cu.id
          OR (cp2.certification_upload_id IS NULL
              AND cu.batch_id IS NOT NULL
              AND cp2.batch_id = cu.batch_id
              AND cp2.partner_id = cu.partner_id)
       ORDER BY cp2.created_at DESC
       LIMIT 1
     )
     ${where}
     ${filterCondition}`,
    params
  );

  return { rows, stats, total, page: parseInt(page), limit: parseInt(limit) };
};

/**
 * List certification requests for partner (own) or admin (all) with derived status.
 */
const listCertificationRequests = async ({ partnerId = null, page = 1, limit = 1000 } = {}) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (partnerId) {
    conditions.push('cu.partner_id = ?');
    params.push(partnerId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = parseInt(limit) || 20;
  const safeOffset = parseInt(offset);

  const [rows] = await db.query(
    `SELECT
       cu.id,
       cu.partner_id,
       cu.center_id,
       cu.batch_id,
       cu.batch_start_date,
       cu.batch_end_date,
       cu.assessment_date,
       cu.status,
       cu.other_batch_number,
       cu.spoke_name,
       cu.spoke_email,
       cu.spoke_mobile,
       cu.reviewed_at,
       cu.remarks,
       cu.rejection_reason,
       cu.created_at,
       cu.essci_step1_at,
       p.name AS partner_name,
       c.center_name,
       COALESCE(b.batch_number, cu.other_batch_number) AS batch_number,
       COALESCE(cu.reviewed_at, cu.created_at) AS updated_at,
       cp.id AS pdf_id,
       cp.status AS pdf_status,
       CASE
         WHEN cu.status = 'pending' THEN 'Pending Admin Review'
         WHEN cu.status = 'rejected' THEN 'Rejected'
         WHEN cp.id IS NULL THEN 'Ongoing'
         WHEN cp.status = 'pending' THEN 'Under review'
         WHEN cp.status = 'approved' THEN 'Done'
         ELSE 'Ongoing'
       END AS derived_status
     FROM certification_uploads cu
     LEFT JOIN partners p ON p.id = cu.partner_id
     LEFT JOIN centers c ON c.id = cu.center_id
     LEFT JOIN batches b ON b.id = cu.batch_id
     LEFT JOIN certification_pdfs cp ON cp.id = (
       SELECT cp2.id
       FROM certification_pdfs cp2
       WHERE cp2.certification_upload_id = cu.id
          OR (cp2.certification_upload_id IS NULL
              AND cu.batch_id IS NOT NULL
              AND cp2.batch_id = cu.batch_id
              AND cp2.partner_id = cu.partner_id)
       ORDER BY cp2.created_at DESC
       LIMIT 1
     )
     ${where}
     ORDER BY COALESCE(cu.reviewed_at, cu.created_at) DESC, cu.created_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) as total FROM certification_uploads cu ${where}`,
    params
  );

  return { rows, total, page: parseInt(page), limit: parseInt(limit) };
};

/**
 * Lists partners (for ESSCI dropdowns).
 */
const getPartnersDropdown = async () => {
  const [rows] = await db.query(
    "SELECT id, name FROM partners WHERE status = 'active' ORDER BY name"
  );
  return rows;
};

/**
 * Centers that have at least one approved certification_upload (for ESSCI dropdowns).
 */
const getCentersDropdown = async (partnerId) => {
  const [rows] = await db.query(
    `SELECT DISTINCT c.id, c.center_name
     FROM centers c
     JOIN certification_uploads cu ON cu.center_id = c.id
     WHERE cu.partner_id = ? AND cu.status = 'approved'
     ORDER BY c.center_name`,
    [partnerId]
  );
  return rows;
};

/**
 * Batches that have an approved certification_upload (for ESSCI dropdowns).
 */
const getBatchesDropdown = async (centerId, partnerId) => {
  const [rows] = await db.query(
    `SELECT DISTINCT b.id, b.batch_number, cu.id as certification_upload_id
     FROM batches b
     JOIN certification_uploads cu ON cu.batch_id = b.id
     WHERE cu.center_id = ? AND cu.partner_id = ? AND cu.status = 'approved'
     ORDER BY b.batch_number`,
    [centerId, partnerId]
  );
  return rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// ESSCI: Step 1 — initial response (QR, link, ID, password)
// ─────────────────────────────────────────────────────────────────────────────

const submitESSCIStep1Response = async ({
  uploadId,
  responseLink,
  responseId,
  responsePassword,
  qrCodeUrl,
  qrCodeName,
  qrCodePath,
  submittedBy,
}) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[upload]] = await connection.query(
      `SELECT cu.*, COALESCE(c.center_name, cu.center_name) AS center_name,
              COALESCE(b.batch_number, cu.other_batch_number) AS batch_number,
              p.name AS partner_name
       FROM certification_uploads cu
       LEFT JOIN centers c ON c.id = cu.center_id
       LEFT JOIN batches b ON b.id = cu.batch_id
       LEFT JOIN partners p ON p.id = cu.partner_id
       WHERE cu.id = ? AND cu.status = 'approved'`,
      [uploadId]
    );

    if (!upload) {
      throw new Error('Certification upload not found or not approved');
    }
    if (upload.essci_step1_at) {
      throw new Error('Initial response has already been submitted for this request');
    }

    await connection.query(
      `UPDATE certification_uploads
       SET essci_response_link = ?,
           essci_response_id = ?,
           essci_response_password = ?,
           essci_qr_code_url = ?,
           essci_qr_code_name = ?,
           essci_step1_at = NOW(),
           essci_step1_by = ?
       WHERE id = ?`,
      [
        responseLink || null,
        responseId || null,
        responsePassword || null,
        qrCodeUrl || null,
        qrCodeName || null,
        submittedBy,
        uploadId,
      ]
    );

    const detailSummary = buildStep1DetailSummary({
      essci_response_link: responseLink,
      essci_response_id: responseId,
      essci_qr_code_name: qrCodeName,
    });

    if (upload.uploaded_by) {
      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message, remark,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certification_essci_step1', 'info',
           'ESSCI Assessment Access Details',
           ?,
           ?,
           'certification_upload', ?, 0, 'platform', NOW())`,
        [
          upload.uploaded_by,
          `ESSCI shared assessment access details for ${upload.center_name || 'your center'} (batch ${upload.batch_number || 'N/A'}).`,
          `Password: ${responsePassword || '—'}`,
          uploadId,
        ]
      );
    }

    await connection.commit();

  const emailService = require('../../../utils/email.util');
  if (upload.spoke_email) {
    try {
      await emailService.sendCertificationSpokeStep1Email({
        toEmail: upload.spoke_email,
        recipientName: upload.spoke_name || 'Center Spoke Person',
        partnerName: upload.partner_name,
        centerName: upload.center_name,
        batchNumber: upload.batch_number,
        batchStartDate: upload.batch_start_date,
        batchEndDate: upload.batch_end_date,
        assessmentDate: upload.assessment_date,
        responseLink,
        responseId,
        responsePassword,
        qrCodePath,
        qrCodeName,
      });
    } catch (emailErr) {
      console.error('[certification] spoke email failed:', emailErr.message);
    }
  }

    return { uploadId, detailSummary };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ESSCI: Step 2 — assessment numbers + final certificate documents
// ─────────────────────────────────────────────────────────────────────────────

const uploadCertificatePDF = async ({
  partnerId,
  centerId,
  batchId,
  certificationUploadId,
  traineesRegistered,
  traineesAttended,
  traineesPassed,
  traineesFailed,
  traineesAbsent,
  zipFileUrl,
  zipFileName,
  studentListUrl,
  studentListName,
  certificationFilesJson,
  uploadedBy,
}) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    if (certificationUploadId) {
      const [[upload]] = await connection.query(
        `SELECT partner_id, center_id, batch_id, essci_step1_at
         FROM certification_uploads WHERE id = ? AND status = 'approved'`,
        [certificationUploadId]
      );
      if (!upload) {
        throw new Error('Certification upload not found');
      }
      if (!upload.essci_step1_at) {
        throw new Error('Submit the initial ESSCI response (Step 1) before uploading certificates');
      }
      // Trust the upload record as the source of truth for partner/center/batch.
      partnerId = upload.partner_id || partnerId;
      centerId = upload.center_id || centerId;
      batchId = upload.batch_id || batchId || null;
    }

    const pdfId = uuidv4();
    await connection.query(
      `INSERT INTO certification_pdfs
         (id, certification_upload_id, partner_id, center_id, batch_id,
          trainees_registered, trainees_attended, trainees_passed, trainees_failed, trainees_absent,
          zip_file_url, zip_file_name, student_list_url, student_list_name,
          certification_files_json,
          status, uploaded_by, reviewed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, NOW(), NOW())`,
      [
        pdfId,
        certificationUploadId || null,
        partnerId,
        centerId,
        batchId || null,
        traineesRegistered || 0,
        traineesAttended || 0,
        traineesPassed || 0,
        traineesFailed || 0,
        traineesAbsent || 0,
        zipFileUrl || null,
        zipFileName || null,
        studentListUrl || null,
        studentListName || null,
        certificationFilesJson || null,
        uploadedBy,
      ]
    );

    const [[pdf]] = await connection.query(
      `SELECT cp.partner_id, cp.batch_id, b.batch_number,
              u.id as partner_user_id
       FROM certification_pdfs cp
       LEFT JOIN batches  b ON b.id = cp.batch_id
       LEFT JOIN users    u ON u.partner_id = cp.partner_id AND u.role = 'PARTNER'
       WHERE cp.id = ?
       LIMIT 1`,
      [pdfId]
    );

    if (pdf?.partner_user_id) {
      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certificate_ready', 'success',
           'Certificates Ready for Download',
           CONCAT('Certificates for batch ', COALESCE(?, ''), ' are now available for download.'),
           'certification_pdf', ?, 0, 'platform', NOW())`,
        [pdf.partner_user_id, pdf.batch_number, pdfId]
      );
    }

    await connection.commit();
    return { pdfId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Approve / Reject certificate PDF
// ─────────────────────────────────────────────────────────────────────────────

const approveCertificatePDF = async (pdfId, adminId, remarks = null) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE certification_pdfs
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), remarks = ?
       WHERE id = ?`,
      [adminId, remarks, pdfId]
    );

    // Find partner user to notify
    const [[pdf]] = await connection.query(
      `SELECT cp.partner_id, cp.batch_id, b.batch_number,
              u.id as partner_user_id
       FROM certification_pdfs cp
       LEFT JOIN batches  b ON b.id = cp.batch_id
       LEFT JOIN users    u ON u.partner_id = cp.partner_id AND u.role = 'PARTNER'
       WHERE cp.id = ?
       LIMIT 1`,
      [pdfId]
    );

    if (pdf && pdf.partner_user_id) {
      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certificate_ready', 'success',
           'Certificate PDF Ready for Download',
           ?,
           'certification_pdf', ?, 0, 'platform', NOW())`,
        [
          pdf.partner_user_id,
          `The certificates for batch ${pdf.batch_number || pdf.batch_id} are ready. You can now download them.`,
          pdfId,
        ]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const rejectCertificatePDF = async (pdfId, adminId, rejectionReason, remarks = null) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE certification_pdfs
       SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
           rejection_reason = ?, remarks = ?
       WHERE id = ?`,
      [adminId, rejectionReason, remarks, pdfId]
    );

    // Notify ESSCI about rejection
    const [[pdf]] = await connection.query(
      'SELECT uploaded_by FROM certification_pdfs WHERE id = ?',
      [pdfId]
    );
    if (pdf) {
      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message, remark,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certificate_pdf_rejected', 'error',
           'Certificate PDF Rejected',
           'Your uploaded certificate PDF has been rejected by the admin.',
           ?,
           'certification_pdf', ?, 0, 'platform', NOW())`,
        [pdf.uploaded_by, rejectionReason, pdfId]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

/**
 * Admin: list all ESSCI-uploaded PDFs pending review.
 */
const getAllCertificatePDFs = async ({ status, page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  const safeLimit4 = parseInt(limit) || 20;
  const safeOffset4 = parseInt(offset);
  const baseParams = status ? [status] : [];
  const where = status ? 'WHERE cp.status = ?' : '';
  const [pdfs] = await db.query(
    `SELECT cp.*,
            p.name      as partner_name,
            c.center_name,
            b.batch_number,
            u.full_name as uploaded_by_name
     FROM certification_pdfs cp
     LEFT JOIN partners p ON p.id = cp.partner_id
     LEFT JOIN centers  c ON c.id = cp.center_id
     LEFT JOIN batches  b ON b.id = cp.batch_id
     LEFT JOIN users    u ON u.id = cp.uploaded_by
     ${where}
     ORDER BY cp.created_at DESC
     LIMIT ${safeLimit4} OFFSET ${safeOffset4}`,
    baseParams
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) as total FROM certification_pdfs cp ${where}`,
    baseParams
  );

  return { pdfs, total, page: parseInt(page), limit: parseInt(limit) };
};

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER: Download page — approved certificate PDFs for this partner
// ─────────────────────────────────────────────────────────────────────────────

const getPartnerCertificatePDFs = async (partnerId, { page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;
  const safeLimit5 = parseInt(limit) || 20;
  const safeOffset5 = parseInt(offset);
  const [pdfs] = await db.query(
    `SELECT cp.*,
            c.center_name,
            b.batch_number
     FROM certification_pdfs cp
     LEFT JOIN centers  c ON c.id = cp.center_id
     LEFT JOIN batches  b ON b.id = cp.batch_id
     WHERE cp.partner_id = ? AND cp.status = 'approved'
     ORDER BY cp.reviewed_at DESC
     LIMIT ${safeLimit5} OFFSET ${safeOffset5}`,
    [partnerId]
  );
  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) as total FROM certification_pdfs WHERE partner_id = ? AND status = 'approved'",
    [partnerId]
  );
  return { pdfs, total, page: parseInt(page), limit: parseInt(limit) };
};

module.exports = {
  createCertificationUpload,
  buildCertificationStatusTimeline,
  getPartnerUploads,
  getUploadDetails,
  approveCertificationUpload,
  rejectCertificationUpload,
  getAllCertificationUploads,
  getESSCIData,
  listCertificationRequests,
  getPartnersDropdown,
  getCentersDropdown,
  getBatchesDropdown,
  uploadCertificatePDF,
  submitESSCIStep1Response,
  approveCertificatePDF,
  rejectCertificatePDF,
  getAllCertificatePDFs,
  getPartnerCertificatePDFs,
};
