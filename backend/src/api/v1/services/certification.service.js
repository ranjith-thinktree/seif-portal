'use strict';

const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const notificationService = require('./notification.service');

// ─────────────────────────────────────────────────────────────────────────────
// CSV Template columns for partner certification upload
// ─────────────────────────────────────────────────────────────────────────────
const CERT_CSV_COLUMNS = [
  'Trainee Name',
  'Student ID',
  'Course Name',
  'Assessment Date',
  'Trainer Name',
  'Marks',
  'Status',
  'Gender',
];

/**
 * Generate a plain CSV template string
 */
const generateCertificationTemplate = () => {
  const header = CERT_CSV_COLUMNS.join(',');
  const sampleRow = [
    'John Doe',
    'STU001',
    'Electrical Technician',
    '2026-03-01',
    'Jane Smith',
    '85',
    'pass',
    'Male',
  ].join(',');
  return `${header}\n${sampleRow}\n`;
};

// ─────────────────────────────────────────────────────────────────────────────
// PARTNER: Upload certification data (CSV rows stored as uploaded_certifications)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a certification_upload record and store parsed CSV rows.
 *
 * @param {Object} params
 * @param {string} params.partnerId
 * @param {string} params.centerId
 * @param {string} params.batchId
 * @param {string|null} params.fileUrl
 * @param {string|null} params.fileName
 * @param {number|null} params.fileSizeBytes
 * @param {string|null} params.validationDocUrl
 * @param {string|null} params.validationDocName
 * @param {Array<Object>} params.rows  - Parsed CSV rows
 * @param {string} params.uploadedBy  - user id
 * @returns {Promise<Object>}
 */
const createCertificationUpload = async (params) => {
  const {
    partnerId,
    centerId,
    batchId,
    fileUrl,
    fileName,
    fileSizeBytes,
    validationDocUrl,
    validationDocName,
    rows,
    uploadedBy,
  } = params;

  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const uploadId = uuidv4();
    await connection.query(
      `INSERT INTO certification_uploads
         (id, partner_id, center_id, batch_id,
          file_url, file_name, file_size_bytes,
          validation_doc_url, validation_doc_name,
          total_records, status, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        uploadId,
        partnerId,
        centerId,
        batchId,
        fileUrl,
        fileName,
        fileSizeBytes || null,
        validationDocUrl,
        validationDocName,
        rows.length,
        uploadedBy,
      ]
    );

    // Insert individual student rows
    for (const row of rows) {
      await connection.query(
        `INSERT INTO uploaded_certifications
           (id, certification_upload_id, partner_id, center_id, batch_id,
            trainee_name, student_id, course_name, assessment_date,
            trainer_name, marks, status, gender, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          uuidv4(),
          uploadId,
          partnerId,
          centerId,
          batchId,
          row.trainee_name || row['Trainee Name'] || '',
          row.student_id || row['Student ID'] || null,
          row.course_name || row['Course Name'] || null,
          row.assessment_date || row['Assessment Date'] || null,
          row.trainer_name || row['Trainer Name'] || null,
          row.marks !== undefined ? row.marks : row['Marks'] !== undefined ? row['Marks'] : null,
          row.status || row['Status'] || null,
          row.gender || row['Gender'] || null,
        ]
      );
    }

    // Notify all admins
    await connection.query(
      `INSERT INTO notifications
         (id, recipient_role, type, alert_type, title, message,
          related_entity_type, related_entity_id, is_read, sent_via, created_at)
       VALUES (UUID(), 'ADMIN', 'certification_upload', 'info',
         'New Certification Data Uploaded',
         ?, 'certification_upload', ?, 0, 'platform', NOW())`,
      [`A partner has uploaded certification data for review (${rows.length} records).`, uploadId]
    );

    await connection.commit();
    return { uploadId, totalRecords: rows.length };
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
  const [rows] = await db.query(
    `SELECT cu.*,
            c.center_name,
            b.batch_number
     FROM certification_uploads cu
     LEFT JOIN centers  c ON c.id = cu.center_id
     LEFT JOIN batches  b ON b.id = cu.batch_id
     WHERE cu.partner_id = ?
     ORDER BY cu.created_at DESC
     LIMIT ? OFFSET ?`,
    [partnerId, parseInt(limit), parseInt(offset)]
  );
  const [[{ total }]] = await db.query(
    'SELECT COUNT(*) as total FROM certification_uploads WHERE partner_id = ?',
    [partnerId]
  );
  return { uploads: rows, total, page: parseInt(page), limit: parseInt(limit) };
};

/**
 * Get one upload + its student rows.
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

  const [students] = await db.query(
    'SELECT * FROM uploaded_certifications WHERE certification_upload_id = ? ORDER BY trainee_name',
    [uploadId]
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
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), parseInt(offset)]
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

  const [rows] = await db.query(
    `SELECT
       cu.id,
       cu.partner_id,
       cu.center_id,
       cu.batch_id,
       cu.total_records,
       cu.created_at,
       p.name      as partner_name,
       p.type      as partner_type,
       c.center_name,
       b.batch_number,
       cp.id       as pdf_id,
       cp.status   as pdf_status,
       cp.file_url as pdf_url,
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
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  // Stats (always across all approved, unaffected by filter)
  const [[stats]] = await db.query(
    `SELECT
       COUNT(DISTINCT cu.partner_id)  as total_partners,
       COUNT(DISTINCT cu.center_id)   as total_centers,
       COALESCE(SUM(cu.total_records), 0)   as total_students,
       (SELECT COUNT(*) FROM uploaded_certifications uc
        JOIN certification_uploads cu2 ON cu2.id = uc.certification_upload_id
        WHERE cu2.status = 'approved' AND (uc.gender = 'Female' OR uc.gender = 'female')) as female_trainees
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
  fileUrl,
  fileName,
  fileSizeBytes,
  uploadedBy,
}) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();

    const pdfId = uuidv4();
    await connection.query(
      `INSERT INTO certification_pdfs
         (id, certification_upload_id, partner_id, center_id, batch_id,
          file_url, file_name, file_size_bytes, status, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        pdfId,
        certificationUploadId || null,
        partnerId,
        centerId,
        batchId,
        fileUrl,
        fileName,
        fileSizeBytes || null,
        uploadedBy,
      ]
    );

    // Notify admins
    await connection.query(
      `INSERT INTO notifications
         (id, recipient_role, type, alert_type, title, message,
          related_entity_type, related_entity_id, is_read, sent_via, created_at)
       VALUES (UUID(), 'ADMIN', 'certification_pdf_uploaded', 'info',
         'Certificate PDF Uploaded by ESSCI',
         'An ESSCI member has uploaded a certificate PDF for admin review.',
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
  const where = status ? 'WHERE cp.status = ?' : '';
  const params = status
    ? [status, parseInt(limit), parseInt(offset)]
    : [parseInt(limit), parseInt(offset)];

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
     LIMIT ? OFFSET ?`,
    params
  );

  const baseParams = status ? [status] : [];
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
  const [pdfs] = await db.query(
    `SELECT cp.*,
            c.center_name,
            b.batch_number
     FROM certification_pdfs cp
     LEFT JOIN centers  c ON c.id = cp.center_id
     LEFT JOIN batches  b ON b.id = cp.batch_id
     WHERE cp.partner_id = ? AND cp.status = 'approved'
     ORDER BY cp.reviewed_at DESC
     LIMIT ? OFFSET ?`,
    [partnerId, parseInt(limit), parseInt(offset)]
  );
  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) as total FROM certification_pdfs WHERE partner_id = ? AND status = 'approved'",
    [partnerId]
  );
  return { pdfs, total, page: parseInt(page), limit: parseInt(limit) };
};

module.exports = {
  CERT_CSV_COLUMNS,
  generateCertificationTemplate,
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
