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
 * @param {string} params.batchId
 * @param {string|null} params.batchStartDate  YYYY-MM-DD
 * @param {string|null} params.batchEndDate    YYYY-MM-DD
 * @param {string|null} params.assessmentDate  YYYY-MM-DD
 * @param {string|null} params.supportDocUrl
 * @param {string|null} params.supportDocName
 * @param {string}      params.uploadedBy      user id
 */
const createCertificationUpload = async (params) => {
  const {
    partnerId,
    centerId,
    batchId,
    batchStartDate,
    batchEndDate,
    assessmentDate,
    supportDocUrl,
    supportDocName,
    uploadedBy,
  } = params;

  const uploadId = uuidv4();
  await db.query(
    `INSERT INTO certification_uploads
       (id, partner_id, center_id, batch_id,
        batch_start_date, batch_end_date, assessment_date,
        support_doc_url, support_doc_name,
        status, uploaded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
    [
      uploadId,
      partnerId,
      centerId,
      batchId,
      batchStartDate || null,
      batchEndDate || null,
      assessmentDate || null,
      supportDocUrl || null,
      supportDocName || null,
      uploadedBy,
    ]
  );

  // Notify all admins
  await db.query(
    `INSERT INTO notifications
       (id, recipient_role, type, alert_type, title, message,
        related_entity_type, related_entity_id, is_read, sent_via, created_at)
     VALUES (UUID(), 'ADMIN', 'certification_upload', 'info',
       'New Certification Data Uploaded',
       'A partner has submitted certification data for review.',
       'certification_upload', ?, 0, 'platform', NOW())`,
    [uploadId]
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
            c.center_name,
            b.batch_number
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

/**
 * Get one upload + associated students from the students table.
 */
const getUploadDetails = async (uploadId, partnerId = null) => {
  const whereExtra = partnerId ? 'AND cu.partner_id = ?' : '';
  const params = partnerId ? [uploadId, partnerId] : [uploadId];

  const [[upload]] = await db.query(
    `SELECT cu.*,
            c.center_name,
            b.batch_number,
            p.name as partner_name
     FROM certification_uploads cu
     LEFT JOIN centers  c ON c.id = cu.center_id
     LEFT JOIN batches  b ON b.id = cu.batch_id
     LEFT JOIN partners p ON p.id = cu.partner_id
     WHERE cu.id = ? ${whereExtra}`,
    params
  );
  if (!upload) return null;

  // Fetch students for this batch from the main students table.
  // Current schema uses partner_student_id (not student_id) and has no status column.
  const [students] = await db.query(
    `SELECT id, student_name AS trainee_name, partner_student_id AS student_id, gender
     FROM students
     WHERE batch_id = ?
     ORDER BY student_name`,
    [upload.batch_id]
  );
  return { ...upload, students };
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
    conditions.push('(p.name LIKE ? OR c.center_name LIKE ? OR b.batch_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const safeLimit2 = parseInt(limit) || 20;
  const safeOffset2 = parseInt(offset);
  const [uploads] = await db.query(
    `SELECT cu.*,
            p.name      as partner_name,
            c.center_name,
            b.batch_number
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
    baseConditions.push('(p.name LIKE ? OR c.center_name LIKE ? OR b.batch_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
       cu.created_at,
       p.name      as partner_name,
       p.organization_type as partner_type,
       c.center_name,
       b.batch_number,
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
     LEFT JOIN certification_pdfs cp ON cp.batch_id = cu.batch_id
                                     AND cp.partner_id = cu.partner_id
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
     LEFT JOIN certification_pdfs cp ON cp.batch_id = cu.batch_id
                                     AND cp.partner_id = cu.partner_id
     ${where}
     ${filterCondition}`,
    params
  );

  return { rows, stats, total, page: parseInt(page), limit: parseInt(limit) };
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
// ESSCI: Upload certificate PDF
// ─────────────────────────────────────────────────────────────────────────────

const uploadCertificatePDF = async ({
  partnerId,
  centerId,
  batchId,
  certificationUploadId,
  traineesAttended,
  traineesPassed,
  traineesFailed,
  traineesAbsent,
  zipFileUrl,
  zipFileName,
  studentListUrl,
  studentListName,
  uploadedBy,
}) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const pdfId = uuidv4();
    await connection.query(
      `INSERT INTO certification_pdfs
         (id, certification_upload_id, partner_id, center_id, batch_id,
          trainees_attended, trainees_passed, trainees_failed, trainees_absent,
          zip_file_url, zip_file_name, student_list_url, student_list_name,
          status, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        pdfId,
        certificationUploadId || null,
        partnerId,
        centerId,
        batchId,
        traineesAttended || 0,
        traineesPassed || 0,
        traineesFailed || 0,
        traineesAbsent || 0,
        zipFileUrl || null,
        zipFileName || null,
        studentListUrl || null,
        studentListName || null,
        uploadedBy,
      ]
    );

    // Notify admins
    await connection.query(
      `INSERT INTO notifications
         (id, recipient_role, type, alert_type, title, message,
          related_entity_type, related_entity_id, is_read, sent_via, created_at)
       VALUES (UUID(), 'ADMIN', 'certification_pdf_uploaded', 'info',
         'Certificate Data Uploaded by ESSCI',
         'An ESSCI member has uploaded attendance and certificate data for admin review.',
         'certification_pdf', ?, 0, 'platform', NOW())`,
      [pdfId]
    );

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
  getPartnerUploads,
  getUploadDetails,
  approveCertificationUpload,
  rejectCertificationUpload,
  getAllCertificationUploads,
  getESSCIData,
  getPartnersDropdown,
  getCentersDropdown,
  getBatchesDropdown,
  uploadCertificatePDF,
  approveCertificatePDF,
  rejectCertificatePDF,
  getAllCertificatePDFs,
  getPartnerCertificatePDFs,
};
