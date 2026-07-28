'use strict';

const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const notificationService = require('./notification.service');

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim().slice(0, 10);
  if (!DATE_ONLY_RE.test(raw)) {
    const err = new Error('Dates must be in YYYY-MM-DD format');
    err.statusCode = 400;
    throw err;
  }
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    const err = new Error('Invalid date value');
    err.statusCode = 400;
    throw err;
  }
  return dt;
}

function addDays(date, days) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Partner certification submit/resubmit date rules:
 * - Start, End, and Assessment dates are all required
 * - Start Date cannot be in the future
 * - End Date has no date limits (any calendar date allowed)
 * - Assessment Date must be within 30 days after End
 */
function assertPartnerCertificationDates({ batchStartDate, batchEndDate, assessmentDate }) {
  const start = parseDateOnly(batchStartDate);
  const end = parseDateOnly(batchEndDate);
  const assessment = parseDateOnly(assessmentDate);
  const today = startOfToday();

  if (!start) {
    const err = new Error('Batch Start Date is required');
    err.statusCode = 400;
    throw err;
  }
  if (!end) {
    const err = new Error('Batch End Date is required');
    err.statusCode = 400;
    throw err;
  }
  if (!assessment) {
    const err = new Error('Assessment Date is required');
    err.statusCode = 400;
    throw err;
  }

  if (start.getTime() > today.getTime()) {
    const err = new Error('Batch Start Date cannot be in the future');
    err.statusCode = 400;
    throw err;
  }

  const assessmentMax = addDays(end, 30);
  if (assessment.getTime() > assessmentMax.getTime()) {
    const err = new Error('Assessment Date cannot be more than 30 days after Batch End Date');
    err.statusCode = 400;
    throw err;
  }
}

/** Practical RFC 5322-style email check (local@domain with at least one dot in domain). */
const SPOKE_EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Indian mobile: exactly 10 digits, starting with 6–9 */
const SPOKE_MOBILE_RE = /^[6-9]\d{9}$/;

function normalizeSpokeMobile(value) {
  if (value == null || value === '') return null;
  return String(value).replace(/[\s\-()]/g, '').trim();
}

/**
 * Partner certification spoke contact — all fields required.
 * - Name: non-empty
 * - Email: standard RFC-style format
 * - Mobile: 10-digit Indian number
 */
function assertPartnerCertificationContact({ spokeName, spokeEmail, spokeMobile }) {
  const name = spokeName != null && String(spokeName).trim() !== ''
    ? String(spokeName).trim()
    : null;
  const email = spokeEmail != null && String(spokeEmail).trim() !== ''
    ? String(spokeEmail).trim()
    : null;
  const mobile = normalizeSpokeMobile(spokeMobile);

  if (!name) {
    const err = new Error('Spoke Name is required');
    err.statusCode = 400;
    throw err;
  }
  if (!email) {
    const err = new Error('Spoke Email is required');
    err.statusCode = 400;
    throw err;
  }
  if (!SPOKE_EMAIL_RE.test(email)) {
    const err = new Error('Spoke Email must be a valid email address');
    err.statusCode = 400;
    throw err;
  }
  if (!mobile) {
    const err = new Error('Spoke Mobile Number is required');
    err.statusCode = 400;
    throw err;
  }
  if (!SPOKE_MOBILE_RE.test(mobile)) {
    const err = new Error(
      'Spoke Mobile Number must be a valid 10-digit Indian mobile number'
    );
    err.statusCode = 400;
    throw err;
  }

  return { spokeName: name, spokeEmail: email, spokeMobile: mobile };
}

async function fetchCertificationNotifyContext(uploadId, executor = null) {
  if (!uploadId) return null;
  const run = executor?.query
    ? executor.query.bind(executor)
    : db.query.bind(db);
  const [[row]] = await run(
    `SELECT
       cu.id AS upload_id,
       p.name AS partner_name,
       COALESCE(c.center_name, cu.center_name) AS center_name,
       COALESCE(b.batch_number, cu.other_batch_number) AS batch_number
     FROM certification_uploads cu
     LEFT JOIN partners p ON p.id = cu.partner_id
     LEFT JOIN centers c ON c.id = cu.center_id
     LEFT JOIN batches b ON b.id = cu.batch_id
     WHERE cu.id = ?`,
    [uploadId]
  );
  return row || null;
}

async function fetchCertificationNotifyContextByPdfId(pdfId, executor = null) {
  if (!pdfId) return null;
  const run = executor?.query
    ? executor.query.bind(executor)
    : db.query.bind(db);
  const [[row]] = await run(
    `SELECT
       cu.id AS upload_id,
       p.name AS partner_name,
       COALESCE(c.center_name, cu.center_name) AS center_name,
       COALESCE(b.batch_number, cu.other_batch_number, b2.batch_number) AS batch_number
     FROM certification_pdfs cp
     LEFT JOIN certification_uploads cu ON cu.id = cp.certification_upload_id
     LEFT JOIN partners p ON p.id = COALESCE(cu.partner_id, cp.partner_id)
     LEFT JOIN centers c ON c.id = COALESCE(cu.center_id, cp.center_id)
     LEFT JOIN batches b ON b.id = cu.batch_id
     LEFT JOIN batches b2 ON b2.id = cp.batch_id
     WHERE cp.id = ?`,
    [pdfId]
  );
  return row || null;
}

function certificationNotifyPayload(ctx) {
  if (!ctx) return null;
  return JSON.stringify({
    partner_name: ctx.partner_name || null,
    partnerName: ctx.partner_name || null,
    center_name: ctx.center_name || null,
    centerName: ctx.center_name || null,
    batch_number: ctx.batch_number || null,
    batchNumber: ctx.batch_number || null,
    upload_id: ctx.upload_id || null,
  });
}

function formatCertNotifyParts(ctx) {
  return {
    partner: ctx?.partner_name || 'Partner',
    center: ctx?.center_name || '—',
    batch: ctx?.batch_number || '—',
  };
}

function formatCertificationAssessmentDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function fetchActiveAdminUsers(executor = null) {
  const run = executor?.query ? executor.query.bind(executor) : db.query.bind(db);
  const [rows] = await run(
    `SELECT email, full_name
     FROM users
     WHERE role = 'ADMIN'
       AND LOWER(status) = 'active'
       AND email IS NOT NULL
       AND TRIM(email) <> ''`
  );
  return rows || [];
}

async function fetchPartnerPrimaryContact(partnerId, executor = null) {
  if (!partnerId) return null;
  const run = executor?.query ? executor.query.bind(executor) : db.query.bind(db);
  const [[row]] = await run(
    `SELECT contact_email AS email,
            contact_person AS contact_name,
            name AS partner_name
     FROM partners
     WHERE id = ?
     LIMIT 1`,
    [partnerId]
  );
  return row || null;
}

async function sendAssessmentRequestAdminEmails({ uploadId, assessmentDate }) {
  try {
    const emailService = require('../../../utils/email.util');
    const notifyCtx = await fetchCertificationNotifyContext(uploadId);
    if (!notifyCtx) return;

    const admins = await fetchActiveAdminUsers();
    const emailPayload = {
      partnerName: notifyCtx.partner_name,
      centerName: notifyCtx.center_name,
      assessmentDate,
      requestId: uploadId,
    };

    for (const admin of admins) {
      try {
        await emailService.sendCertificationAssessmentRequestAdminEmail({
          toEmail: admin.email,
          recipientName: admin.full_name || 'Admin',
          ...emailPayload,
        });
      } catch (emailErr) {
        console.error(
          `[certification] admin assessment-request email failed for ${admin.email}:`,
          emailErr.message
        );
      }
    }
  } catch (emailBatchErr) {
    console.error(
      '[certification] admin assessment-request email batch failed:',
      emailBatchErr.message
    );
  }
}

async function sendAssessmentApprovedPartnerEmail({ uploadId }) {
  try {
    const emailService = require('../../../utils/email.util');
    const [[uploadRow]] = await db.query(
      `SELECT partner_id, assessment_date
       FROM certification_uploads
       WHERE id = ?
       LIMIT 1`,
      [uploadId]
    );
    const notifyCtx = await fetchCertificationNotifyContext(uploadId);
    const partnerContact = await fetchPartnerPrimaryContact(uploadRow?.partner_id);
    if (!notifyCtx || !partnerContact?.email) return;

    await emailService.sendCertificationAssessmentApprovedPartnerEmail({
      toEmail: partnerContact.email,
      recipientName: partnerContact.contact_name || partnerContact.partner_name || 'Partner',
      partnerName: notifyCtx.partner_name,
      centerName: notifyCtx.center_name,
      batchNumber: notifyCtx.batch_number,
      assessmentDate: formatCertificationAssessmentDate(uploadRow?.assessment_date),
      requestId: uploadId,
    });
  } catch (emailErr) {
    console.error('[certification] partner approval email failed:', emailErr.message);
  }
}

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

  assertPartnerCertificationDates({ batchStartDate, batchEndDate, assessmentDate });
  const contact = assertPartnerCertificationContact({
    spokeName,
    spokeEmail,
    spokeMobile,
  });

  const uploadId = uuidv4();
  await db.query(
    `INSERT INTO certification_uploads
       (id, partner_id, center_id, center_name, batch_id, other_batch_number,
        batch_start_date, batch_end_date, assessment_date,
        spoke_name, spoke_email, spoke_mobile,
        status, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
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
      contact.spokeName,
      contact.spokeEmail,
      contact.spokeMobile,
      uploadedBy,
    ]
  );

  const notifyCtx = await fetchCertificationNotifyContext(uploadId);
  const { partner, center, batch } = formatCertNotifyParts(notifyCtx);
  const payloadJson = certificationNotifyPayload(notifyCtx);

  // Notify admins to review the submission
  await db.query(
    `INSERT INTO notifications
       (id, recipient_role, type, alert_type, title, message, payload,
        related_entity_type, related_entity_id, is_read, sent_via, created_at)
     VALUES (UUID(), 'ADMIN', 'certification_submitted', 'info',
       'New Certification Request Received',
       ?,
       ?,
       'certification_upload', ?, 0, 'platform', NOW())`,
    [
      `${partner} submitted certification data for ${center} (Batch ${batch}) for admin review.`,
      payloadJson,
      uploadId,
    ]
  );

  // Notify submitting partner
  await db.query(
    `INSERT INTO notifications
       (id, recipient_id, type, alert_type, title, message, payload,
        related_entity_type, related_entity_id, is_read, sent_via, created_at)
     VALUES (UUID(), ?, 'certification_submitted', 'success',
       'Certification Request Received',
       ?,
       ?,
       'certification_upload', ?, 0, 'platform', NOW())`,
    [
      uploadedBy,
      `Your certification data for ${center} (Batch ${batch}) has been submitted and is pending admin approval.`,
      payloadJson,
      uploadId,
    ]
  );

  await sendAssessmentRequestAdminEmails({
    uploadId,
    assessmentDate: formatCertificationAssessmentDate(assessmentDate),
  });

  return { uploadId };
};

/**
 * Partner resubmits a rejected certification request (same upload id).
 */
const resubmitCertificationUpload = async (uploadId, partnerId, params) => {
  const {
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

  assertPartnerCertificationDates({ batchStartDate, batchEndDate, assessmentDate });
  const contact = assertPartnerCertificationContact({
    spokeName,
    spokeEmail,
    spokeMobile,
  });

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[existing]] = await connection.query(
      `SELECT id, status FROM certification_uploads WHERE id = ? AND partner_id = ?`,
      [uploadId, partnerId]
    );
    if (!existing) {
      throw new Error('Certification upload not found');
    }
    if (existing.status !== 'rejected') {
      throw new Error('Only rejected certification requests can be resubmitted');
    }

    await connection.query(
      `UPDATE certification_uploads
       SET center_id = ?,
           center_name = ?,
           batch_id = ?,
           other_batch_number = ?,
           batch_start_date = ?,
           batch_end_date = ?,
           assessment_date = ?,
           spoke_name = ?,
           spoke_email = ?,
           spoke_mobile = ?,
           status = 'pending',
           rejection_reason = NULL,
           remarks = NULL,
           reviewed_by = NULL,
           reviewed_at = NULL,
           uploaded_by = ?,
           updated_at = NOW()
       WHERE id = ? AND partner_id = ?`,
      [
        centerId,
        centerName || null,
        batchId || null,
        otherBatchNumber || null,
        batchStartDate || null,
        batchEndDate || null,
        assessmentDate || null,
        contact.spokeName,
        contact.spokeEmail,
        contact.spokeMobile,
        uploadedBy,
        uploadId,
        partnerId,
      ]
    );

    const notifyCtx = await fetchCertificationNotifyContext(uploadId, connection);
    const { partner, center, batch } = formatCertNotifyParts(notifyCtx);
    const payloadJson = certificationNotifyPayload(notifyCtx);

    await connection.query(
      `INSERT INTO notifications
         (id, recipient_role, type, alert_type, title, message, payload,
          related_entity_type, related_entity_id, is_read, sent_via, created_at)
       VALUES (UUID(), 'ADMIN', 'certification_submitted', 'info',
         'Certification Request Resubmitted',
         ?,
         ?,
         'certification_upload', ?, 0, 'platform', NOW())`,
      [
        `${partner} resubmitted certification data for ${center} (Batch ${batch}) for admin review.`,
        payloadJson,
        uploadId,
      ]
    );

    await connection.query(
      `INSERT INTO notifications
         (id, recipient_id, type, alert_type, title, message, payload,
          related_entity_type, related_entity_id, is_read, sent_via, created_at)
       VALUES (UUID(), ?, 'certification_submitted', 'success',
         'Certification Request Resubmitted',
         ?,
         ?,
         'certification_upload', ?, 0, 'platform', NOW())`,
      [
        uploadedBy,
        `Your corrected certification data for ${center} (Batch ${batch}) has been resubmitted and is pending admin approval.`,
        payloadJson,
        uploadId,
      ]
    );

    await connection.commit();

    await sendAssessmentRequestAdminEmails({
      uploadId,
      assessmentDate: formatCertificationAssessmentDate(assessmentDate),
    });

    return { uploadId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
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
    label: 'Request Received',
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
      key: 'admin_approved',
      status: 'approved',
      label: 'Admin Approved',
      occurred_at: upload.reviewed_at || upload.created_at,
      detail: upload.remarks || null,
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
    if (!pdf || pdf.status === 'rejected') {
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

const ADMIN_ONLY_TIMELINE_KEYS = new Set([
  'admin_review_pending',
  'admin_rejected',
  'admin_approved',
]);

const filterTimelineForAudience = (timeline, audience = 'default') => {
  if (!timeline || audience !== 'essci') return timeline;
  const events = (timeline.events || []).filter(
    (event) => !ADMIN_ONLY_TIMELINE_KEYS.has(event.key)
  );
  const current = events.find((event) => event.is_current) || events[events.length - 1] || null;
  return {
    ...timeline,
    events: events.map((event) => ({
      ...event,
      is_current: current ? event.key === current.key : false,
      is_latest: current ? event.key === current.key : false,
    })),
    current_status: current?.key || timeline.current_status,
    current_status_label: current?.label || timeline.current_status_label,
    derived_status: timeline.derived_status,
  };
};

/**
 * Get one upload + associated students from the students table.
 */
const getUploadDetails = async (uploadId, partnerId = null, options = {}) => {
  const { audience = 'default', requireApproved = false } = options;
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
  if (requireApproved && upload.status !== 'approved') {
    return null;
  }

  let archivedFiles = [];
  if (upload.pdf_id != null && upload.pdf_status === 'approved') {
    try {
      const fileArchiveService = require('./certificationFileArchive.service');
      archivedFiles = await fileArchiveService.listArchivedFilesByUploadId(uploadId);
    } catch (archiveListErr) {
      console.error('[certification] list archived files for detail failed:', archiveListErr.message);
    }
  }

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
          archived_files: archivedFiles.map((f) => ({
            id: f.id,
            file_type: f.file_type,
            original_name: f.original_name,
            storage_month: f.storage_month,
          })),
          created_at: upload.pdf_created_at,
          reviewed_at: upload.pdf_reviewed_at,
          remarks: upload.pdf_remarks,
          rejection_reason: upload.pdf_rejection_reason,
        }
      : null;

  const statusTimeline = filterTimelineForAudience(
    buildCertificationStatusTimeline(upload, pdf),
    audience
  );

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

    const [[existing]] = await connection.query(
      `SELECT id, status FROM certification_uploads WHERE id = ?`,
      [uploadId]
    );
    if (!existing) {
      throw new Error('Certification upload not found');
    }
    if (existing.status !== 'pending') {
      throw new Error('Only pending certification uploads can be approved');
    }

    await connection.query(
      `UPDATE certification_uploads
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), remarks = ?
       WHERE id = ?`,
      [adminId, remarks, uploadId]
    );

    // Notify the uploading partner + ESSCI
    const [[upload]] = await connection.query(
      'SELECT uploaded_by, partner_id FROM certification_uploads WHERE id = ?',
      [uploadId]
    );
    if (upload) {
      const notifyCtx = await fetchCertificationNotifyContext(uploadId, connection);
      const { partner, center, batch } = formatCertNotifyParts(notifyCtx);
      const payloadJson = certificationNotifyPayload(notifyCtx);

      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message, payload,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certification_approved', 'success',
           'Certification Data Approved',
           ?,
           ?,
           'certification_upload', ?, 0, 'platform', NOW())`,
        [
          upload.uploaded_by,
          `Your certification data for ${center} (Batch ${batch}) has been approved by the admin.`,
          payloadJson,
          uploadId,
        ]
      );
      await connection.query(
        `INSERT INTO notifications
           (id, recipient_role, type, alert_type, title, message, payload,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), 'ESSCI', 'certification_approved', 'info',
           'New Certification Request Ready',
           ?,
           ?,
           'certification_upload', ?, 0, 'platform', NOW())`,
        [
          `${partner} — ${center} (Batch ${batch}) has been approved and is ready for ESSCI processing.`,
          payloadJson,
          uploadId,
        ]
      );
    }

    await connection.commit();

    await sendAssessmentApprovedPartnerEmail({ uploadId });

    // Email all active ESSCI users (non-blocking for approval success)
    try {
      const [[ctx]] = await db.query(
        `SELECT cu.id,
                cu.assessment_date,
                COALESCE(c.center_name, cu.center_name) AS center_name,
                COALESCE(b.batch_number, cu.other_batch_number) AS batch_number,
                p.name AS partner_name
         FROM certification_uploads cu
         LEFT JOIN centers c ON c.id = cu.center_id
         LEFT JOIN batches b ON b.id = cu.batch_id
         LEFT JOIN partners p ON p.id = cu.partner_id
         WHERE cu.id = ?`,
        [uploadId]
      );
      const [essciUsers] = await db.query(
        `SELECT email, full_name
         FROM users
         WHERE role = 'ESSCI'
           AND LOWER(status) = 'active'
           AND email IS NOT NULL
           AND TRIM(email) <> ''`
      );
      if (ctx && essciUsers.length) {
        const emailService = require('../../../utils/email.util');
        const assessmentDate =
          ctx.assessment_date instanceof Date
            ? ctx.assessment_date.toISOString().slice(0, 10)
            : ctx.assessment_date
              ? String(ctx.assessment_date).slice(0, 10)
              : null;
        for (const user of essciUsers) {
          try {
            await emailService.sendCertificationApprovedEssciEmail({
              toEmail: user.email,
              recipientName: user.full_name || 'ESSCI Team',
              partnerName: ctx.partner_name,
              centerName: ctx.center_name,
              batchNumber: ctx.batch_number,
              requestId: uploadId,
              assessmentDate,
            });
          } catch (emailErr) {
            console.error(
              `[certification] ESSCI approval email failed for ${user.email}:`,
              emailErr.message
            );
          }
        }
      }
    } catch (emailBatchErr) {
      console.error('[certification] ESSCI approval email batch failed:', emailBatchErr.message);
    }
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

    const [[existing]] = await connection.query(
      `SELECT id, status FROM certification_uploads WHERE id = ?`,
      [uploadId]
    );
    if (!existing) {
      throw new Error('Certification upload not found');
    }
    if (existing.status !== 'pending') {
      throw new Error('Only pending certification uploads can be rejected');
    }

    await connection.query(
      `UPDATE certification_uploads
       SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
           rejection_reason = ?, remarks = ?
       WHERE id = ?`,
      [adminId, rejectionReason, remarks, uploadId]
    );

    const [[upload]] = await connection.query(
      `SELECT cu.*,
              COALESCE(c.center_name, cu.center_name) AS center_name,
              COALESCE(b.batch_number, cu.other_batch_number) AS batch_number,
              p.name AS partner_name,
              u.email AS partner_user_email,
              u.full_name AS partner_user_name
       FROM certification_uploads cu
       LEFT JOIN centers c ON c.id = cu.center_id
       LEFT JOIN batches b ON b.id = cu.batch_id
       LEFT JOIN partners p ON p.id = cu.partner_id
       LEFT JOIN users u ON u.id = cu.uploaded_by
       WHERE cu.id = ?`,
      [uploadId]
    );
    if (upload) {
      const { center, batch } = formatCertNotifyParts(upload);
      const payloadJson = certificationNotifyPayload({
        upload_id: uploadId,
        partner_name: upload.partner_name,
        center_name: upload.center_name,
        batch_number: upload.batch_number,
      });
      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message, remark, payload,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certification_rejected', 'error',
           'Certification Request Rejected',
           ?,
           ?,
           ?,
           'certification_upload', ?, 0, 'platform', NOW())`,
        [
          upload.uploaded_by,
          `Your certification request for ${center} (Batch ${batch}) was rejected. Please review the reason and resubmit the same request with corrected details.`,
          rejectionReason,
          payloadJson,
          uploadId,
        ]
      );
    }

    await connection.commit();

    if (upload?.partner_user_email) {
      const emailService = require('../../../utils/email.util');
      try {
        await emailService.sendCertificationRejectionEmail({
          toEmail: upload.partner_user_email,
          recipientName: upload.partner_user_name || upload.partner_name || 'Partner',
          partnerName: upload.partner_name,
          centerName: upload.center_name,
          batchNumber: upload.batch_number,
          requestId: uploadId,
          rejectionReason,
          remarks,
        });
      } catch (emailErr) {
        console.error('[certification] rejection email failed:', emailErr.message);
      }
    }
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
// ESSCI: assessment numbers + final certificate documents
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
  assessmentDate,
  uploadedBy,
}) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    if (certificationUploadId) {
      const [[upload]] = await connection.query(
        `SELECT partner_id, center_id, batch_id
         FROM certification_uploads WHERE id = ? AND status = 'approved'`,
        [certificationUploadId]
      );
      if (!upload) {
        throw new Error('Certification upload not found or not approved');
      }
      // Trust the upload record as the source of truth for partner/center/batch.
      partnerId = upload.partner_id || partnerId;
      centerId = upload.center_id || centerId;
      batchId = upload.batch_id || batchId || null;

      if (assessmentDate) {
        await connection.query(
          `UPDATE certification_uploads
           SET assessment_date = ?, updated_at = NOW()
           WHERE id = ?`,
          [assessmentDate, certificationUploadId]
        );
      }
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
      `SELECT cp.partner_id, cp.batch_id, cp.certification_upload_id, b.batch_number,
              u.id as partner_user_id
       FROM certification_pdfs cp
       LEFT JOIN batches  b ON b.id = cp.batch_id
       LEFT JOIN users    u ON u.partner_id = cp.partner_id AND u.role = 'PARTNER'
       WHERE cp.id = ?
       LIMIT 1`,
      [pdfId]
    );

    if (pdf?.partner_user_id) {
      const notifyCtx =
        (pdf.certification_upload_id
          ? await fetchCertificationNotifyContext(pdf.certification_upload_id, connection)
          : null) ||
        (await fetchCertificationNotifyContextByPdfId(pdfId, connection));
      const { partner, center, batch } = formatCertNotifyParts(notifyCtx);
      const payloadJson = certificationNotifyPayload(notifyCtx);
      const relatedUploadId = notifyCtx?.upload_id || pdf.certification_upload_id || pdfId;

      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message, payload,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certificate_ready', 'success',
           'Certificates Ready for Download',
           ?,
           ?,
           'certification_upload', ?, 0, 'platform', NOW())`,
        [
          pdf.partner_user_id,
          `Certificates for ${partner} — ${center} (Batch ${batch}) are now available for download.`,
          payloadJson,
          relatedUploadId,
        ]
      );
    }

    await connection.commit();

    try {
      const fileArchiveService = require('./certificationFileArchive.service');
      await fileArchiveService.archiveCertificationPdfFiles(pdfId);
    } catch (archiveErr) {
      console.error('[certification] archive after upload failed:', archiveErr);
    }

    // Email partner + all active ADMIN users (non-blocking)
    try {
      const emailService = require('../../../utils/email.util');
      const notifyCtx =
        (certificationUploadId
          ? await fetchCertificationNotifyContext(certificationUploadId)
          : null) ||
        (await fetchCertificationNotifyContextByPdfId(pdfId));
      const assessmentDateValue =
        assessmentDate ||
        (notifyCtx?.assessment_date
          ? String(notifyCtx.assessment_date).slice(0, 10)
          : null);

      // Prefer assessment_date from upload record
      let assessmentForEmail = assessmentDateValue;
      if (!assessmentForEmail && notifyCtx?.upload_id) {
        const [[uploadRow]] = await db.query(
          'SELECT assessment_date FROM certification_uploads WHERE id = ?',
          [notifyCtx.upload_id]
        );
        if (uploadRow?.assessment_date) {
          assessmentForEmail =
            uploadRow.assessment_date instanceof Date
              ? uploadRow.assessment_date.toISOString().slice(0, 10)
              : String(uploadRow.assessment_date).slice(0, 10);
        }
      }

      const requestId = notifyCtx?.upload_id || certificationUploadId || null;
      const emailPayload = {
        partnerName: notifyCtx?.partner_name,
        centerName: notifyCtx?.center_name,
        batchNumber: notifyCtx?.batch_number,
        requestId,
        assessmentDate: assessmentForEmail,
      };

      const partnerRecipients = [];
      const seenEmails = new Set();

      const addPartnerRecipient = (email, recipientName) => {
        const normalized = String(email || '').trim().toLowerCase();
        if (!normalized || seenEmails.has(normalized)) return;
        seenEmails.add(normalized);
        partnerRecipients.push({
          email: String(email).trim(),
          recipientName: recipientName || notifyCtx?.partner_name || 'Partner',
        });
      };

      let partnerIdForContact = pdf?.partner_id || null;
      let spokeName = null;
      let spokeEmail = null;
      if (requestId) {
        const [[uploadContact]] = await db.query(
          `SELECT partner_id, spoke_name, spoke_email
           FROM certification_uploads
           WHERE id = ?
           LIMIT 1`,
          [requestId]
        );
        partnerIdForContact = uploadContact?.partner_id || partnerIdForContact;
        spokeName = uploadContact?.spoke_name || null;
        spokeEmail = uploadContact?.spoke_email || null;
      }

      const partnerContact = await fetchPartnerPrimaryContact(partnerIdForContact);
      if (partnerContact?.email) {
        addPartnerRecipient(
          partnerContact.email,
          partnerContact.contact_name || partnerContact.partner_name
        );
      }
      addPartnerRecipient(spokeEmail, spokeName);

      for (const recipient of partnerRecipients) {
        try {
          await emailService.sendCertificationCertificatesReadyPartnerEmail({
            toEmail: recipient.email,
            recipientName: recipient.recipientName,
            ...emailPayload,
          });
        } catch (emailErr) {
          console.error(
            `[certification] partner certificates email failed for ${recipient.email}:`,
            emailErr.message
          );
        }
      }

      const adminUsers = await fetchActiveAdminUsers();
      for (const admin of adminUsers) {
        try {
          await emailService.sendCertificationCertificatesReadyAdminEmail({
            toEmail: admin.email,
            recipientName: admin.full_name || 'Admin',
            ...emailPayload,
          });
        } catch (emailErr) {
          console.error(
            `[certification] admin certificates email failed for ${admin.email}:`,
            emailErr.message
          );
        }
      }
    } catch (emailBatchErr) {
      console.error(
        '[certification] certificates-ready email batch failed:',
        emailBatchErr.message
      );
    }

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
      `SELECT cp.partner_id, cp.batch_id, cp.certification_upload_id, b.batch_number,
              u.id as partner_user_id
       FROM certification_pdfs cp
       LEFT JOIN batches  b ON b.id = cp.batch_id
       LEFT JOIN users    u ON u.partner_id = cp.partner_id AND u.role = 'PARTNER'
       WHERE cp.id = ?
       LIMIT 1`,
      [pdfId]
    );

    if (pdf && pdf.partner_user_id) {
      const notifyCtx =
        (pdf.certification_upload_id
          ? await fetchCertificationNotifyContext(pdf.certification_upload_id, connection)
          : null) ||
        (await fetchCertificationNotifyContextByPdfId(pdfId, connection));
      const { partner, center, batch } = formatCertNotifyParts(notifyCtx);
      const payloadJson = certificationNotifyPayload(notifyCtx);
      const relatedUploadId = notifyCtx?.upload_id || pdf.certification_upload_id || pdfId;

      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message, payload,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certificate_ready', 'success',
           'Certificate PDF Ready for Download',
           ?,
           ?,
           'certification_upload', ?, 0, 'platform', NOW())`,
        [
          pdf.partner_user_id,
          `The certificates for ${partner} — ${center} (Batch ${batch}) are ready. You can now download them.`,
          payloadJson,
          relatedUploadId,
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
      'SELECT uploaded_by, certification_upload_id FROM certification_pdfs WHERE id = ?',
      [pdfId]
    );
    if (pdf) {
      const notifyCtx =
        (pdf.certification_upload_id
          ? await fetchCertificationNotifyContext(pdf.certification_upload_id, connection)
          : null) ||
        (await fetchCertificationNotifyContextByPdfId(pdfId, connection));
      const { partner, center, batch } = formatCertNotifyParts(notifyCtx);
      const payloadJson = certificationNotifyPayload(notifyCtx);
      const relatedUploadId = notifyCtx?.upload_id || pdf.certification_upload_id || pdfId;

      await connection.query(
        `INSERT INTO notifications
           (id, recipient_id, type, alert_type, title, message, remark, payload,
            related_entity_type, related_entity_id, is_read, sent_via, created_at)
         VALUES (UUID(), ?, 'certificate_pdf_rejected', 'error',
           'Certificate PDF Rejected',
           ?,
           ?,
           ?,
           'certification_upload', ?, 0, 'platform', NOW())`,
        [
          pdf.uploaded_by,
          `Certificate upload for ${partner} — ${center} (Batch ${batch}) was rejected by the admin.`,
          rejectionReason,
          payloadJson,
          relatedUploadId,
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
  resubmitCertificationUpload,
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
  approveCertificatePDF,
  rejectCertificatePDF,
  getAllCertificatePDFs,
  getPartnerCertificatePDFs,
};
