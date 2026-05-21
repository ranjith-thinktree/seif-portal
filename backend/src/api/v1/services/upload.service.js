const pool = require('../../../database/connection').pool;
const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { generateUniqueStudentIdentifier } = require('../../../utils/studentId.util');
const {
  resolveEffectiveUploadStatus,
  syncUploadLifecycle,
} = require('../../../utils/uploadStatus.util');

/**
 * Upload Service
 * Handles database operations for data uploads
 */

/**
 * Get all courses from database
 */
const getAllCourses = async () => {
  try {
    const [courses] = await pool.query(
      'SELECT id, course_name, course_code, duration_months FROM courses WHERE is_active = 1'
    );
    return courses;
  } catch (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }
};

/**
 * Get partner by ID
 */
const getPartnerById = async (partnerId) => {
  try {
    const [partners] = await pool.query(
      'SELECT id, name, organization_type, city, state FROM partners WHERE id = ?',
      [partnerId]
    );
    return partners[0] || null;
  } catch (error) {
    throw new Error(`Failed to fetch partner: ${error.message}`);
  }
};

/**
 * Get partner's active centers for CSV template
 */
const getPartnerActiveCenters = async (partnerId) => {
  try {
    const [centers] = await pool.query(
      `SELECT id, center_id, center_name, city, state, country
       FROM centers 
       WHERE partner_id = ? 
       AND status = 'active' 
       AND approval_status = 'approved'
       ORDER BY center_id ASC`,
      [partnerId]
    );
    return centers;
  } catch (error) {
    throw new Error(`Failed to fetch partner centers: ${error.message}`);
  }
};

/**
 * Check for duplicate batches in the upload
 * Returns array of error messages for duplicate batches
 */
const checkDuplicateBatches = async (partnerId, centerMap) => {
  try {
    const errors = [];

    // Get center_id to center.id mapping
    const [centers] = await pool.query(`SELECT id, center_id FROM centers WHERE partner_id = ?`, [
      partnerId,
    ]);

    const centerIdMap = {};
    centers.forEach((center) => {
      centerIdMap[center.center_id] = center.id;
    });

    // Check each center and batch combination
    for (const [csvCenterId, centerData] of centerMap) {
      const centerId = centerIdMap[csvCenterId];

      if (!centerId) {
        continue; // Skip if center not found (already handled in validation)
      }

      // Get existing batches for this center
      const [existingBatches] = await pool.query(
        `SELECT batch_number FROM batches WHERE center_id = ? AND partner_id = ?`,
        [centerId, partnerId]
      );

      const existingBatchNumbers = new Set(existingBatches.map((b) => b.batch_number));

      // Check each batch in upload
      for (const [batchNumber] of centerData.batches) {
        if (existingBatchNumbers.has(batchNumber)) {
          errors.push(`Center ${csvCenterId}: Batch "${batchNumber}" already exists in the system`);
        }
      }
    }

    return errors;
  } catch (error) {
    console.error('Error checking duplicate batches:', error);
    throw new Error(`Failed to check duplicate batches: ${error.message}`);
  }
};

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const normalizeDate = (value) => {
  if (!value) {
    return '';
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
    const [day, month, year] = text.split('-');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return normalizeText(text);
  }

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
};

const buildStudentSignature = (student) => ({
  student_name: normalizeText(student.student_name),
  father_name: normalizeText(student.father_name),
  date_of_birth: normalizeDate(student.date_of_birth),
  gender: normalizeText(student.gender),
  mobile_number: normalizeText(student.mobile_number),
  email: normalizeText(student.email),
  qualification: normalizeText(student.qualification),
  address: normalizeText(student.address),
  city: normalizeText(student.city),
  district: normalizeText(student.district),
  state: normalizeText(student.state),
  country: normalizeText(student.country),
  enrollment_date: normalizeDate(student.enrollment_date),
  course_name: normalizeText(student.course_name),
  course_duration_months: normalizeText(student.course_duration_months),
});

const hashUploadStructure = (structure) =>
  crypto.createHash('sha256').update(JSON.stringify(structure)).digest('hex');

const buildCenterMapFingerprint = (centerMap) => {
  const structure = Array.from(centerMap.entries())
    .map(([centerId, centerData]) => ({
      center_id: normalizeText(centerId),
      batches: Array.from(centerData.batches.entries())
        .map(([batchNumber, batchData]) => ({
          batch_number: normalizeText(batchNumber),
          batch_start_date: normalizeDate(batchData.batchData?.batch_start_date),
          batch_complete_date: normalizeDate(batchData.batchData?.batch_complete_date),
          students: (batchData.students || [])
            .map(buildStudentSignature)
            .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
        }))
        .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

  return hashUploadStructure(structure);
};

const buildStoredUploadFingerprint = async (connection, uploadId) => {
  const [centers] = await connection.query(
    `SELECT id, csv_center_id
     FROM uploaded_centers
     WHERE data_upload_id = ?`,
    [uploadId]
  );

  const structure = [];

  for (const center of centers) {
    const [batches] = await connection.query(
      `SELECT id, batch_number, batch_start_date, batch_complete_date
       FROM uploaded_batches
       WHERE uploaded_center_id = ?`,
      [center.id]
    );

    const batchStructures = [];

    for (const batch of batches) {
      const [students] = await connection.query(
        `SELECT student_name, father_name, date_of_birth, gender, mobile_number,
                email, qualification, address, city, district, state, country,
                enrollment_date, course_name, course_duration_months
         FROM uploaded_students
         WHERE uploaded_batch_id = ?`,
        [batch.id]
      );

      batchStructures.push({
        batch_number: normalizeText(batch.batch_number),
        batch_start_date: normalizeDate(batch.batch_start_date),
        batch_complete_date: normalizeDate(batch.batch_complete_date),
        students: students
          .map(buildStudentSignature)
          .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
      });
    }

    structure.push({
      center_id: normalizeText(center.csv_center_id),
      batches: batchStructures.sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right))
      ),
    });
  }

  return hashUploadStructure(
    structure.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  );
};

const findDuplicateUpload = async (partnerId, fileName, centerMap) => {
  const connection = await pool.getConnection();

  try {
    const [uploads] = await connection.query(
      `SELECT id, file_name, status, created_at, reviewed_at
       FROM data_uploads
       WHERE partner_id = ?
         AND deleted_at IS NULL
         AND LOWER(TRIM(file_name)) = ?`,
      [partnerId, normalizeText(fileName)]
    );

    if (uploads.length === 0) {
      return null;
    }

    const incomingFingerprint = buildCenterMapFingerprint(centerMap);

    for (const upload of uploads) {
      const existingFingerprint = await buildStoredUploadFingerprint(connection, upload.id);

      if (existingFingerprint !== incomingFingerprint) {
        continue;
      }

      const effectiveStatus = await resolveEffectiveUploadStatus(
        connection,
        upload.id,
        upload.status
      );
      const statusLabel = effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1);

      if (effectiveStatus === 'approved' || effectiveStatus === 'partial') {
        return {
          id: upload.id,
          status: effectiveStatus,
          fileName: upload.file_name,
          createdAt: upload.created_at,
          reviewedAt: upload.reviewed_at,
          message:
            'This file has already been uploaded with the same file name and data. The existing upload has already been reviewed, so it cannot be uploaded again.',
          helpText: `${statusLabel} upload found in Upload History. Approved or partially approved uploads cannot be deleted. Remove the related production data first, then upload only the revised data set.`,
        };
      }

      return {
        id: upload.id,
        status: effectiveStatus,
        fileName: upload.file_name,
        createdAt: upload.created_at,
        reviewedAt: upload.reviewed_at,
        message:
          'This file has already been uploaded with the same file name and data. Delete the existing upload from Upload History before uploading it again.',
        helpText: `${statusLabel} upload found in Upload History. Remove it from Upload History first, then retry this upload.`,
      };
    }

    return null;
  } finally {
    connection.release();
  }
};

/**
 * Get upload version number for partner (deprecated - version column removed)
 */
const getNextVersionNumber = async (partnerId) => {
  // Version column no longer exists in database
  // Return 1 for backward compatibility with controller code
  return 1;
};

/**
 * Create data upload record
 */
const createDataUpload = async (uploadData) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { partnerId, fileName, fileUrl, totalRecords, uploadedBy } = uploadData;

    // Insert into data_uploads table with UUID
    const uploadId = (await connection.query('SELECT UUID() as id'))[0][0].id;

    await connection.query(
      `INSERT INTO data_uploads 
      (id, partner_id, upload_type, file_name, file_url, total_records, status, uploaded_by, created_at) 
      VALUES (?, ?, 'center_batch_student', ?, ?, ?, 'pending', ?, NOW())`,
      [uploadId, partnerId, fileName, fileUrl, totalRecords, uploadedBy]
    );

    await connection.commit();

    return uploadId;
  } catch (error) {
    await connection.rollback();
    throw new Error(`Failed to create upload record: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * Save parsed data to staging tables
 */
const saveUploadedData = async (dataUploadId, partnerId, centerMap) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Initialize counters
    let totalCenters = 0;
    let totalBatches = 0;
    let totalStudents = 0;
    const errors = [];
    // Track student fingerprints within this upload to catch intra-file duplicates
    // Key: partnerId|centerId|courseName|studentName|dateOfBirth
    const seenInUpload = new Set();

    // Iterate through centers
    for (const [csvCenterId, centerData] of centerMap) {
      totalCenters++;

      // Validate that center exists and is approved
      const [existingCenters] = await connection.query(
        `SELECT id, center_id, center_name, center_type, region, city, state, address, 
                year_of_establishment, status, center_head, mobile_number, email 
         FROM centers 
         WHERE partner_id = ? AND center_id = ? AND approval_status = 'approved'
         LIMIT 1`,
        [partnerId, csvCenterId]
      );

      if (existingCenters.length === 0) {
        // Center not found or not approved - reject this upload
        errors.push(
          `Center "${csvCenterId}" does not exist or is not approved. Please create and get approval for this center first.`
        );
        continue; // Skip this center
      }

      const approvedCenter = existingCenters[0];
      const approvedCenterId = approvedCenter.id;

      // Create uploaded_centers entry (required for foreign key relationships)
      const uploadedCenterId = (await connection.query('SELECT UUID() as id'))[0][0].id;

      await connection.query(
        `INSERT INTO uploaded_centers 
        (id, data_upload_id, partner_id, csv_center_id, center_name, center_type, 
         region, city, state, address, year_of_establishment, status, center_head, 
         mobile_number, email, approval_status, approved_center_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
        [
          uploadedCenterId,
          dataUploadId,
          partnerId,
          csvCenterId,
          approvedCenter.center_name,
          approvedCenter.center_type,
          approvedCenter.region,
          approvedCenter.city,
          approvedCenter.state,
          approvedCenter.address,
          approvedCenter.year_of_establishment,
          approvedCenter.status,
          approvedCenter.center_head,
          approvedCenter.mobile_number,
          approvedCenter.email,
          approvedCenterId, // Link to approved center
        ]
      );

      // Iterate through batches
      for (const [batchNumber, batchData] of centerData.batches) {
        totalBatches++;

        // Calculate student counts from actual student data
        const totalBatchStudents = batchData.students.length;
        const maleStudents = batchData.students.filter((s) => s.gender === 'Male').length;
        const femaleStudents = batchData.students.filter((s) => s.gender === 'Female').length;

        // Generate UUID for batch
        const uploadedBatchId = (await connection.query('SELECT UUID() as id'))[0][0].id;

        // Insert batch - reference uploaded_centers entry
        await connection.query(
          `INSERT INTO uploaded_batches 
          (id, data_upload_id, csv_center_id, uploaded_center_id, partner_id, batch_number, 
           batch_start_date, batch_complete_date, total_students, male_students, 
           female_students, approval_status, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [
            uploadedBatchId,
            dataUploadId,
            csvCenterId,
            uploadedCenterId, // Use uploaded_centers.id (not centers.id)
            partnerId,
            batchData.batchData.batch_number,
            batchData.batchData.batch_start_date,
            batchData.batchData.batch_complete_date,
            totalBatchStudents,
            maleStudents,
            femaleStudents,
          ]
        );

        // Insert students with new fields
        for (const student of batchData.students) {
          // Build duplicate fingerprint: partner + center + course + name + dob
          const dupKey = [
            partnerId,
            csvCenterId,
            (student.course_name || '').trim().toLowerCase(),
            (student.student_name || '').trim().toLowerCase(),
            student.date_of_birth || '',
          ].join('|');

          // Reject intra-file duplicates (same student+course appears twice in this upload)
          if (seenInUpload.has(dupKey)) {
            errors.push(
              `Duplicate student in upload: "${student.student_name}" for course "${student.course_name}" in center "${csvCenterId}" appears more than once.`
            );
            continue;
          }
          seenInUpload.add(dupKey);

          // Reject if this student+course already exists in the approved students table
          const [existingApproved] = await connection.query(
            `SELECT id FROM students
             WHERE partner_id = ? AND center_id = ?
               AND LOWER(course_name) = LOWER(?)
               AND LOWER(student_name) = LOWER(?)
               AND date_of_birth = ?`,
            [
              partnerId,
              approvedCenterId,
              student.course_name,
              student.student_name,
              student.date_of_birth,
            ]
          );
          if (existingApproved.length > 0) {
            errors.push(
              `Student "${student.student_name}" is already approved for course "${student.course_name}" in center "${csvCenterId}". Duplicate records are not allowed.`
            );
            continue;
          }

          totalStudents++;
          const studentUuid = (await connection.query('SELECT UUID() as id'))[0][0].id;

          // Use batch start date as enrollment date if not provided
          const enrollmentDate = student.enrollment_date || batchData.batchData.batch_start_date;

          await connection.query(
            `INSERT INTO uploaded_students 
            (id, data_upload_id, csv_center_id, uploaded_batch_id, uploaded_center_id, 
             partner_id, partner_student_id, student_name, father_name, date_of_birth, gender, 
             mobile_number, email, qualification, address, city, state, district, country,
             enrollment_date, course_name, course_duration_months, 
             approval_status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
              studentUuid,
              dataUploadId,
              csvCenterId,
              uploadedBatchId,
              uploadedCenterId, // Use uploaded_centers.id (not centers.id)
              partnerId,
              null,
              student.student_name,
              student.father_name,
              student.date_of_birth,
              student.gender,
              student.mobile_number,
              student.email,
              student.qualification,
              student.address,
              student.city,
              student.state,
              student.district,
              student.country || 'India',
              enrollmentDate,
              student.course_name,
              student.course_duration_months,
            ]
          );
        }
      }
    }

    // If there were validation errors, rollback and return errors
    if (errors.length > 0) {
      await connection.rollback();
      throw Object.assign(new Error(errors.join('\n')), {
        code: 'UPLOAD_VALIDATION_ERRORS',
        errors,
      });
    }

    // Update data_uploads with totals and initialize review progress
    await connection.query(
      `UPDATE data_uploads 
       SET centers_total = ?, 
           total_centers = ?,
           total_batches = ?,
           total_students = ?,
           review_progress = 'not_started'
       WHERE id = ?`,
      [totalCenters, totalCenters, totalBatches, totalStudents, dataUploadId]
    );

    await connection.commit();

    return { success: true };
  } catch (error) {
    await connection.rollback();
    // Re-throw structured errors as-is so callers can inspect error.code / error.errors
    if (error.code) throw error;
    throw new Error(`Failed to save uploaded data: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * Create notification for admin (deprecated - moved to notification.service.js)
 */
const createNotificationForAdmin = async (dataUploadId, partnerId, partnerName, fileName) => {
  console.warn('createNotificationForAdmin is deprecated. Use notificationService instead.');
};

/**
 * Get all uploads for partner
 */
const getPartnerUploads = async (partnerId, page = 1, limit = 10, filters = {}) => {
  const connection = await db.getConnection();
  try {
    const offset = (page - 1) * limit;
    const validLimit = parseInt(limit);
    const validOffset = parseInt(offset);

    const conditions = ['du.partner_id = ?', 'du.deleted_at IS NULL'];
    const params = [partnerId];

    if (filters.status) {
      conditions.push('du.status = ?');
      params.push(filters.status);
    }
    if (filters.dateFrom) {
      conditions.push('DATE(du.created_at) >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push('DATE(du.created_at) <= ?');
      params.push(filters.dateTo);
    }

    const whereClause = conditions.join(' AND ');

    const [uploads] = await connection.query(
      `SELECT 
        du.id, du.file_name, du.file_url, du.total_records, du.version,
        du.status, du.rejection_reason, du.remarks,
        du.created_at, du.reviewed_at,
        u.full_name as uploaded_by_name,
        r.full_name as reviewed_by_name
      FROM data_uploads du
      LEFT JOIN users u ON du.uploaded_by = u.id
      LEFT JOIN users r ON du.reviewed_by = r.id
      WHERE ${whereClause}
      ORDER BY du.created_at DESC
      LIMIT ${validLimit} OFFSET ${validOffset}`,
      params
    );

    const uploadsWithStatus = await Promise.all(
      uploads.map(async (upload) => ({
        ...upload,
        status: await resolveEffectiveUploadStatus(connection, upload.id, upload.status),
      }))
    );

    return { uploads: uploadsWithStatus };
  } catch (error) {
    throw new Error(`Failed to fetch uploads: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * Get upload details with preview data
 */
const getUploadDetails = async (uploadId, partnerId) => {
  try {
    // Get upload info
    const [uploads] = await pool.query(
      `SELECT 
        du.*, 
        p.name as partner_name,
        u.full_name as uploaded_by_name,
        r.full_name as reviewed_by_name
      FROM data_uploads du
      LEFT JOIN partners p ON du.partner_id = p.id
      LEFT JOIN users u ON du.uploaded_by = u.id
      LEFT JOIN users r ON du.reviewed_by = r.id
      WHERE du.id = ? AND du.partner_id = ?`,
      [uploadId, partnerId]
    );

    if (uploads.length === 0) {
      return null;
    }

    const upload = uploads[0];
    upload.status = await resolveEffectiveUploadStatus(pool, uploadId, upload.status);

    // Get centers count
    const [centerCount] = await pool.query(
      'SELECT COUNT(DISTINCT csv_center_id) as count FROM uploaded_centers WHERE data_upload_id = ?',
      [uploadId]
    );

    // Get batches count
    const [batchCount] = await pool.query(
      'SELECT COUNT(*) as count FROM uploaded_batches WHERE data_upload_id = ?',
      [uploadId]
    );

    // Get students count
    const [studentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM uploaded_students WHERE data_upload_id = ?',
      [uploadId]
    );

    // Get sample data (first 5 students)
    const [sampleStudents] = await pool.query(
      `SELECT 
        us.student_name, us.gender, us.course_name,
        uc.center_name, ub.batch_number
      FROM uploaded_students us
      JOIN uploaded_centers uc ON us.uploaded_center_id = uc.id
      JOIN uploaded_batches ub ON us.uploaded_batch_id = ub.id
      WHERE us.data_upload_id = ?
      LIMIT 5`,
      [uploadId]
    );

    return {
      ...upload,
      summary: {
        centersCount: centerCount[0].count,
        batchesCount: batchCount[0].count,
        studentsCount: studentCount[0].count,
        sampleStudents,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch upload details: ${error.message}`);
  }
};

/**
 * Get all uploads for admin review
 */
const getAllUploadsForAdmin = async (status = null, page = 1, limit = 10, filters = {}) => {
  try {
    const offset = (page - 1) * limit;

    const studentConditions = ['du.deleted_at IS NULL'];
    const studentParams = [];
    const employmentConditions = ['eu.deleted_at IS NULL'];
    const employmentParams = [];

    if (status) {
      studentConditions.push('du.status = ?');
      studentParams.push(status);
      employmentConditions.push('eu.status = ?');
      employmentParams.push(status);
    }
    if (filters.dateFrom) {
      studentConditions.push('DATE(du.created_at) >= ?');
      studentParams.push(filters.dateFrom);
      employmentConditions.push('DATE(eu.created_at) >= ?');
      employmentParams.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      studentConditions.push('DATE(du.created_at) <= ?');
      studentParams.push(filters.dateTo);
      employmentConditions.push('DATE(eu.created_at) <= ?');
      employmentParams.push(filters.dateTo);
    }
    if (filters.partnerId) {
      studentConditions.push('du.partner_id = ?');
      studentParams.push(filters.partnerId);
      employmentConditions.push('eu.partner_id = ?');
      employmentParams.push(filters.partnerId);
    }

    const studentWhere =
      studentConditions.length > 0 ? `WHERE ${studentConditions.join(' AND ')}` : '';
    const employmentWhere = `WHERE ${employmentConditions.join(' AND ')}`;

    const [uploads] = await pool.query(
      `(SELECT
          du.id, du.file_name, du.total_records, du.status,
          du.created_at, du.reviewed_at,
          du.version,
          p.name as partner_name,
          u.full_name as uploaded_by_name,
          ru.full_name as reviewed_by_name,
          'student' as upload_type
        FROM data_uploads du
        LEFT JOIN partners p ON du.partner_id = p.id
        LEFT JOIN users u ON du.uploaded_by = u.id
        LEFT JOIN users ru ON du.reviewed_by = ru.id
        ${studentWhere})
      UNION ALL
      (SELECT
          eu.id, eu.file_name, eu.total_records, eu.status,
          eu.created_at, eu.reviewed_at,
          eu.version,
          p.name as partner_name,
          u.full_name as uploaded_by_name,
          ru.full_name as reviewed_by_name,
          'employment' as upload_type
        FROM employment_uploads eu
        LEFT JOIN partners p ON eu.partner_id = p.id
        LEFT JOIN users u ON eu.uploaded_by = u.id
        LEFT JOIN users ru ON eu.reviewed_by = ru.id
        ${employmentWhere})
      ORDER BY
        CASE WHEN status IN ('pending', 'pending_review') THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
      [...studentParams, ...employmentParams]
    );

    const uploadsWithStatus = await Promise.all(
      uploads.map(async (upload) => {
        if (upload.upload_type === 'student') {
          return {
            ...upload,
            status: await resolveEffectiveUploadStatus(pool, upload.id, upload.status),
          };
        }
        return upload;
      })
    );

    const [countResult] = await pool.query(
      `SELECT (
          SELECT COUNT(*) FROM data_uploads du ${studentWhere}
        ) + (
          SELECT COUNT(*) FROM employment_uploads eu ${employmentWhere}
        ) as total`,
      [...studentParams, ...employmentParams]
    );

    return {
      uploads: uploadsWithStatus,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].total),
        totalPages: Math.ceil(Number(countResult[0].total) / limit),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch uploads for admin: ${error.message}`);
  }
};

/**
 * Get upload details for admin review (OPTIMIZED - Summary Only)
 * Returns upload metadata and center/batch counts without loading all students
 */
const getUploadDetailsForAdmin = async (uploadId) => {
  try {
    // Get upload info
    const [uploads] = await pool.query(
      `SELECT 
        du.*, 
        p.name as partner_name, p.organization_type,
        u.full_name as uploaded_by_name, u.email as uploaded_by_email
      FROM data_uploads du
      LEFT JOIN partners p ON du.partner_id = p.id
      LEFT JOIN users u ON du.uploaded_by = u.id
      WHERE du.id = ?`,
      [uploadId]
    );

    if (uploads.length === 0) {
      return null;
    }

    const upload = uploads[0];

    // Get all centers with batch and student counts (NO student data loaded)
    const [centers] = await pool.query(
      `SELECT 
        uc.*, 
        COUNT(DISTINCT ub.id) as batch_count,
        COUNT(us.id) as student_count
      FROM uploaded_centers uc
      LEFT JOIN uploaded_batches ub ON uc.id = ub.uploaded_center_id
      LEFT JOIN uploaded_students us ON uc.id = us.uploaded_center_id
      WHERE uc.data_upload_id = ?
      GROUP BY uc.id
      ORDER BY uc.csv_center_id`,
      [uploadId]
    );

    // For each center, get batches with student counts (NO student data loaded)
    for (const center of centers) {
      const [batches] = await pool.query(
        `SELECT 
          ub.*,
          COUNT(us.id) as student_count
        FROM uploaded_batches ub
        LEFT JOIN uploaded_students us ON ub.id = us.uploaded_batch_id
        WHERE ub.uploaded_center_id = ?
        GROUP BY ub.id
        ORDER BY ub.batch_number`,
        [center.id]
      );

      // DON'T load students here - they will be loaded on-demand per batch
      center.batches = batches;
    }

    return {
      ...upload,
      centers,
    };
  } catch (error) {
    throw new Error(`Failed to fetch upload details for admin: ${error.message}`);
  }
};

/**
 * Get students for a specific batch (PAGINATED)
 * Used for on-demand loading when user expands a batch
 */
const getBatchStudents = async (batchId, page = 1, limit = 50) => {
  try {
    const offset = (page - 1) * limit;
    const validLimit = parseInt(limit);
    const validOffset = parseInt(offset);

    // Get paginated students
    const [students] = await pool.query(
      `SELECT * FROM uploaded_students 
       WHERE uploaded_batch_id = ? 
       ORDER BY partner_student_id 
       LIMIT ${validLimit} OFFSET ${validOffset}`,
      [batchId]
    );

    // Get total count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM uploaded_students WHERE uploaded_batch_id = ?',
      [batchId]
    );

    return {
      students,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch batch students: ${error.message}`);
  }
};

/**
 * Approve upload - move data from staging to production tables
 */
const approveUpload = async (uploadId, reviewedBy, remarks = null) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update data_uploads status
    await connection.query(
      `UPDATE data_uploads 
      SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), remarks = ?
      WHERE id = ?`,
      [reviewedBy, remarks, uploadId]
    );

    // Get all centers from this upload
    const [centers] = await connection.query(
      'SELECT * FROM uploaded_centers WHERE data_upload_id = ?',
      [uploadId]
    );

    // ── Pre-flight duplicate scan ─────────────────────────────────────────────
    // Check every staged student against already-approved records BEFORE writing
    // anything. If any conflict is found, block the entire approval and report
    // the exact rows so the partner can correct and resubmit.
    const duplicateConflicts = [];
    for (const center of centers) {
      const approvedCenterIdPre = center.approved_center_id;
      const [allBatchesPre] = await connection.query(
        'SELECT * FROM uploaded_batches WHERE uploaded_center_id = ?',
        [center.id]
      );
      for (const batch of allBatchesPre) {
        const [allStudentsPre] = await connection.query(
          'SELECT * FROM uploaded_students WHERE uploaded_batch_id = ?',
          [batch.id]
        );
        for (const student of allStudentsPre) {
          const [existing] = await connection.query(
            `SELECT s.id, s.partner_student_id, s.course_name,
                    b.batch_number, c.center_id AS center_code
             FROM students s
             LEFT JOIN batches b ON b.id = s.batch_id
             LEFT JOIN centers c ON c.id = s.center_id
             WHERE s.partner_id = ?
               AND s.center_id = ?
               AND LOWER(s.course_name) = LOWER(?)
               AND LOWER(s.student_name) = LOWER(?)
               AND s.date_of_birth = ?
             LIMIT 1`,
            [
              student.partner_id,
              approvedCenterIdPre,
              student.course_name,
              student.student_name,
              student.date_of_birth,
            ]
          );
          if (existing.length > 0) {
            duplicateConflicts.push({
              student_name: student.student_name,
              father_name: student.father_name || '—',
              date_of_birth: student.date_of_birth,
              course_name: student.course_name,
              batch_number: batch.batch_number,
              center_id: center.csv_center_id || center.center_id,
              existing_student_id: existing[0].partner_student_id,
              existing_batch: existing[0].batch_number,
            });
          }
        }
      }
    }

    if (duplicateConflicts.length > 0) {
      const lines = duplicateConflicts.map(
        (c, i) =>
          `  Row ${i + 1}: Student "${c.student_name}" (Father: ${c.father_name}, DOB: ${c.date_of_birth}) ` +
          `for course "${c.course_name}" in center "${c.center_id}" / batch "${c.batch_number}" ` +
          `already exists as ID "${c.existing_student_id}" (batch: ${c.existing_batch || 'N/A'}).`
      );
      await connection.rollback();
      throw Object.assign(
        new Error(
          `Approval blocked — ${duplicateConflicts.length} student record(s) already exist in the system:\n${lines.join('\n')}\n\n` +
            `Please ask the partner to remove these rows and resubmit.`
        ),
        { code: 'DUPLICATE_STUDENTS', conflicts: duplicateConflicts }
      );
    }
    // ── End pre-flight duplicate scan ─────────────────────────────────────────

    for (const center of centers) {
      // Use the existing approved center — always set by saveUploadedData which
      // requires the center to exist in production before confirming an upload.
      const approvedCenterId = center.approved_center_id;

      // Update uploaded_centers status (center already exists in production)
      await connection.query('UPDATE uploaded_centers SET approval_status = ? WHERE id = ?', [
        'approved',
        center.id,
      ]);

      // Get batches for this center
      const [batches] = await connection.query(
        'SELECT * FROM uploaded_batches WHERE uploaded_center_id = ?',
        [center.id]
      );

      for (const batch of batches) {
        // Generate UUID for the new batch
        const approvedBatchId = uuidv4();

        // Insert into production batches table
        await connection.query(
          `INSERT INTO batches 
          (id, center_id, partner_id, batch_number, batch_start_date, batch_complete_date, 
           total_students, male_students, female_students, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            approvedBatchId,
            approvedCenterId,
            batch.partner_id,
            batch.batch_number,
            batch.batch_start_date,
            batch.batch_complete_date,
            batch.total_students,
            batch.male_students,
            batch.female_students,
            batch.status,
          ]
        );

        // Update uploaded_batches with approved_batch_id
        await connection.query(
          'UPDATE uploaded_batches SET approval_status = ?, approved_batch_id = ? WHERE id = ?',
          ['approved', approvedBatchId, batch.id]
        );

        // Get students for this batch
        const [students] = await connection.query(
          'SELECT * FROM uploaded_students WHERE uploaded_batch_id = ?',
          [batch.id]
        );

        // Insert students into production table
        for (const student of students) {
          const approvedStudentId = uuidv4();
          const partnerStudentId = await generateUniqueStudentIdentifier(
            connection,
            student.partner_id,
            student,
            { uploadedStudentId: student.id }
          );

          await connection.query(
            `INSERT INTO students 
            (id, center_id, batch_id, partner_id, partner_student_id, student_name, father_name,
             date_of_birth, gender, mobile_number, email, address, city, state, district, country,
             qualification, enrollment_date, course_name, course_duration_months, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              approvedStudentId,
              approvedCenterId,
              approvedBatchId,
              student.partner_id,
              partnerStudentId,
              student.student_name,
              student.father_name || null,
              student.date_of_birth,
              student.gender,
              student.mobile_number,
              student.email,
              student.address,
              student.city,
              student.state,
              student.district || null,
              student.country || null,
              student.qualification || null,
              student.enrollment_date,
              student.course_name,
              student.course_duration_months,
            ]
          );

          // Update uploaded_students with approved_student_id
          await connection.query(
            'UPDATE uploaded_students SET approval_status = ?, approved_student_id = ?, partner_student_id = ? WHERE id = ?',
            ['approved', approvedStudentId, partnerStudentId, student.id]
          );
        }
      }
    }

    await syncUploadLifecycle(connection, uploadId, reviewedBy, 'approved');

    // Create notification for partner
    const [uploadInfo] = await connection.query(
      'SELECT partner_id, uploaded_by FROM data_uploads WHERE id = ?',
      [uploadId]
    );

    if (uploadInfo.length > 0) {
      await connection.query(
        `INSERT INTO notifications 
        (id, recipient_id, type, alert_type, title, message, remark, related_entity_type, related_entity_id, is_read, sent_via, created_at) 
        VALUES (?, ?, 'approval', 'data_approval', ?, ?, ?, 'data_upload', ?, 0, 'platform', NOW())`,
        [
          uuidv4(),
          uploadInfo[0].uploaded_by,
          'Data Upload Approved',
          `Your data upload has been approved and moved to production.`,
          remarks || '',
          uploadId,
        ]
      );
    }

    await connection.commit();

    return { success: true };
  } catch (error) {
    await connection.rollback();
    // Re-throw structured errors (e.g. DUPLICATE_STUDENTS) as-is so the controller
    // can inspect error.code / error.conflicts and return the right HTTP status.
    if (error.code) throw error;
    throw new Error(`Failed to approve upload: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * Reject upload
 */
const rejectUpload = async (uploadId, reviewedBy, rejectionReason, remarks = null) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update data_uploads status
    await connection.query(
      `UPDATE data_uploads 
      SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), 
          rejection_reason = ?, remarks = ?
      WHERE id = ?`,
      [reviewedBy, rejectionReason, remarks, uploadId]
    );

    // Update all related records to rejected status
    await connection.query(
      'UPDATE uploaded_centers SET approval_status = ?, rejection_reason = ? WHERE data_upload_id = ?',
      ['rejected', rejectionReason, uploadId]
    );

    await connection.query(
      'UPDATE uploaded_batches SET approval_status = ? WHERE data_upload_id = ?',
      ['rejected', uploadId]
    );

    await connection.query(
      'UPDATE uploaded_students SET approval_status = ? WHERE data_upload_id = ?',
      ['rejected', uploadId]
    );

    await syncUploadLifecycle(connection, uploadId, reviewedBy, 'rejected');

    // Create notification for partner
    const [uploadInfo] = await connection.query(
      'SELECT partner_id, uploaded_by FROM data_uploads WHERE id = ?',
      [uploadId]
    );

    if (uploadInfo.length > 0) {
      await connection.query(
        `INSERT INTO notifications 
        (id, recipient_id, type, alert_type, title, message, remark, related_entity_type, related_entity_id, is_read, sent_via, created_at) 
        VALUES (?, ?, 'rejection', 'data_reject', ?, ?, ?, 'data_upload', ?, 0, 'platform', NOW())`,
        [
          uuidv4(),
          uploadInfo[0].uploaded_by,
          'Data Upload Rejected',
          `Your data upload has been rejected. Reason: ${rejectionReason}.`,
          remarks || '',
          uploadId,
        ]
      );
    }

    await connection.commit();

    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw new Error(`Failed to reject upload: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * Resubmit upload with edited student data (creates version 2)
 * @param {string} originalUploadId - Original rejected upload ID
 * @param {Array} editedStudents - Array of edited student records
 * @param {string} userId - User who is resubmitting
 * @param {string} partnerId - Partner ID
 * @returns {Promise<Object>} New upload details
 */
const resubmitWithEdits = async (originalUploadId, editedStudents, userId, partnerId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get original upload details
    const [originalUpload] = await connection.query(
      'SELECT * FROM data_uploads WHERE id = ? AND partner_id = ?',
      [originalUploadId, partnerId]
    );

    if (originalUpload.length === 0) {
      throw new Error('Original upload not found or unauthorized');
    }

    const original = originalUpload[0];
    const newUploadId = uuidv4();
    const version = (original.version || 1) + 1;

    // Create new upload record (version 2)
    await connection.query(
      `INSERT INTO data_uploads 
      (id, partner_id, upload_type, version, parent_upload_id, file_url, file_name, 
       total_records, total_centers, total_batches, total_students,
       centers_total, status, uploaded_by, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        newUploadId,
        partnerId,
        original.upload_type,
        version,
        original.parent_upload_id || originalUploadId, // Track original upload
        original.file_url,
        original.file_name.replace(/\.csv$/, `_v${version}.csv`),
        original.total_records,
        original.total_centers,
        original.total_batches,
        original.total_students,
        original.centers_total,
        userId,
      ]
    );

    // Copy all centers from original upload
    await connection.query(
      `INSERT INTO uploaded_centers 
      (id, data_upload_id, center_id, center_name, city, state, student_count, review_status, created_at)
      SELECT UUID(), ?, center_id, center_name, city, state, student_count, 'pending', NOW()
      FROM uploaded_centers 
      WHERE data_upload_id = ?`,
      [newUploadId, originalUploadId]
    );

    // Copy all batches from original upload
    await connection.query(
      `INSERT INTO uploaded_batches
      (id, data_upload_id, uploaded_center_id, batch_number, batch_start_date, batch_completion_date, 
       total_students, male_students, female_students, created_at)
      SELECT UUID(), ?, 
             (SELECT id FROM uploaded_centers WHERE data_upload_id = ? AND center_id = ub.center_id LIMIT 1),
             ub.batch_number, ub.batch_start_date, ub.batch_completion_date,
             ub.total_students, ub.male_students, ub.female_students, NOW()
      FROM uploaded_batches ub
      INNER JOIN uploaded_centers uc ON ub.uploaded_center_id = uc.id
      WHERE uc.data_upload_id = ?`,
      [newUploadId, newUploadId, originalUploadId]
    );

    // Get all students from original upload
    const [originalStudents] = await connection.query(
      `SELECT us.* FROM uploaded_students us
       INNER JOIN uploaded_centers uc ON us.uploaded_center_id = uc.id
       WHERE uc.data_upload_id = ?`,
      [originalUploadId]
    );

    // Create a map of edited students by ID
    const editedMap = new Map();
    editedStudents.forEach((student) => {
      editedMap.set(student.id, student);
    });

    // Insert students with edits and log changes
    for (const originalStudent of originalStudents) {
      const newStudentId = uuidv4();
      const editedStudent = editedMap.get(originalStudent.id);

      // Get the new uploaded_center_id for this student's center
      const [newCenter] = await connection.query(
        `SELECT id FROM uploaded_centers 
         WHERE data_upload_id = ? AND center_id = ?`,
        [newUploadId, originalStudent.center_id]
      );

      const studentData = editedStudent || originalStudent;

      // Get uploaded_batch_id for this student
      const [batchInfo] = await connection.query(
        `SELECT id FROM uploaded_batches 
         WHERE data_upload_id = ? AND uploaded_center_id = ?
         LIMIT 1`,
        [newUploadId, newCenter[0].id]
      );

      // Insert student record
      await connection.query(
        `INSERT INTO uploaded_students 
        (id, data_upload_id, csv_center_id, uploaded_batch_id, uploaded_center_id, 
         partner_id, partner_student_id, student_name, father_name, date_of_birth, gender, 
         mobile_number, email, qualification, address, city, state, district, country,
         enrollment_date, course_name, course_duration_months, 
         approval_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          newStudentId,
          newUploadId,
          originalStudent.csv_center_id,
          batchInfo.length > 0 ? batchInfo[0].id : null,
          newCenter[0].id,
          partnerId,
          null,
          studentData.student_name,
          studentData.father_name,
          studentData.date_of_birth,
          studentData.gender,
          studentData.mobile_number,
          studentData.email,
          studentData.qualification,
          studentData.address,
          studentData.city,
          studentData.state,
          studentData.district,
          studentData.country || 'India',
          studentData.enrollment_date,
          studentData.course_name,
          studentData.course_duration_months,
        ]
      );

      // Log edits if this student was modified
      if (editedStudent) {
        const fieldsToCheck = [
          'student_name',
          'father_name',
          'date_of_birth',
          'gender',
          'mobile_number',
          'email',
          'qualification',
          'address',
          'city',
          'state',
          'district',
          'enrollment_date',
          'course_name',
          'course_duration_months',
        ];

        for (const field of fieldsToCheck) {
          if (originalStudent[field] !== editedStudent[field]) {
            await connection.query(
              `INSERT INTO data_edit_logs 
              (id, upload_id, original_upload_id, record_id, field_name, old_value, new_value, edited_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [
                uuidv4(),
                newUploadId,
                originalUploadId,
                newStudentId,
                field,
                originalStudent[field],
                editedStudent[field],
                userId,
              ]
            );
          }
        }
      }
    }

    // Create notification for admin about resubmission
    const adminNotificationId = uuidv4();
    await connection.query(
      `INSERT INTO notifications 
      (id, recipient_id, recipient_role, type, alert_type, title, message, related_entity_type, related_entity_id, is_read, sent_via, created_at) 
      VALUES (?, NULL, 'admin', 'upload', 'info', ?, ?, 'data_upload', ?, 0, 'platform', NOW())`,
      [
        adminNotificationId,
        'Data Resubmitted - Version ' + version,
        `Partner has resubmitted data with corrections. This is version ${version} of the upload.`,
        newUploadId,
      ]
    );

    await connection.commit();

    return {
      success: true,
      newUploadId,
      version,
      totalEdits: editedStudents.length,
      message: `Successfully created version ${version} with ${editedStudents.length} edited records`,
    };
  } catch (error) {
    await connection.rollback();
    throw new Error(`Failed to resubmit upload: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * Delete upload (only pending/rejected, prevent deletion if has child versions)
 */
const deleteUpload = async (uploadId, userId, userRole) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get upload details
    const [uploads] = await connection.query('SELECT * FROM data_uploads WHERE id = ?', [uploadId]);

    if (uploads.length === 0) {
      throw new Error('Upload not found');
    }

    const upload = uploads[0];
    const effectiveStatus = await resolveEffectiveUploadStatus(connection, uploadId, upload.status);

    // Permission check: Partner can only delete their own, Admin can delete any
    if (userRole === 'PARTNER' && upload.partner_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own uploads');
    }

    // Prevent deletion of approved or partial uploads
    if (effectiveStatus === 'approved' || effectiveStatus === 'partial') {
      throw new Error(
        'Cannot delete approved uploads. Data has been moved to production and cannot be removed.'
      );
    }

    // Check if this upload has child versions (resubmissions)
    const [childVersions] = await connection.query(
      'SELECT id FROM data_uploads WHERE parent_upload_id = ?',
      [uploadId]
    );

    if (childVersions.length > 0) {
      throw new Error(
        `Cannot delete this upload. It has ${childVersions.length} resubmitted version(s). Please delete child versions first.`
      );
    }

    // Delete in correct order to respect foreign key constraints

    // 1. Delete notifications related to this upload
    await connection.query(
      `DELETE FROM notifications 
       WHERE related_entity_type = 'data_upload' AND related_entity_id = ?`,
      [uploadId]
    );

    // 2. Delete uploaded_students
    await connection.query('DELETE FROM uploaded_students WHERE data_upload_id = ?', [uploadId]);

    // 3. Delete uploaded_batches
    await connection.query('DELETE FROM uploaded_batches WHERE data_upload_id = ?', [uploadId]);

    // 4. Delete uploaded_centers
    await connection.query('DELETE FROM uploaded_centers WHERE data_upload_id = ?', [uploadId]);

    // 5. Delete data_uploads (data_edit_logs will auto-cascade)
    await connection.query('DELETE FROM data_uploads WHERE id = ?', [uploadId]);

    // 6. Delete physical file if exists
    if (upload.file_url) {
      const fs = require('fs');
      const filePath = upload.file_url;

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileError) {
          console.error(`Failed to delete file ${filePath}:`, fileError.message);
          // Continue anyway - database cleanup is more important
        }
      }
    }

    await connection.commit();

    return {
      success: true,
      message: 'Upload deleted successfully',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Bulk delete uploads with cascade delete of uploaded data
 * @param {Array<string>} uploadIds - Array of upload IDs to delete
 * @param {string} userId - User ID performing the action
 * @param {string} userRole - User role (ADMIN, SUPER_ADMIN, PARTNER)
 * @returns {Promise<Object>} Deletion results with success/failure details
 */
const bulkDeleteUploads = async (uploadIds, userId, userRole) => {
  const results = {
    success: [],
    failed: [],
    summary: {
      total: uploadIds.length,
      successful: 0,
      failed: 0,
    },
  };

  // Process each upload
  for (const uploadId of uploadIds) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get upload details
      const [uploads] = await connection.query('SELECT * FROM data_uploads WHERE id = ?', [
        uploadId,
      ]);

      if (uploads.length === 0) {
        results.failed.push({
          id: uploadId,
          readable_id: uploadId,
          name: 'Unknown',
          reason: 'Upload not found',
        });
        await connection.rollback();
        connection.release();
        continue;
      }

      const upload = uploads[0];
      const effectiveStatus = await resolveEffectiveUploadStatus(
        connection,
        uploadId,
        upload.status
      );

      // Permission check: Partner can only delete their own, Admin can delete any
      if (userRole === 'PARTNER' && upload.partner_id !== userId) {
        results.failed.push({
          id: uploadId,
          readable_id: upload.file_name || uploadId,
          name: upload.file_name || 'Unknown',
          reason: 'Not authorized to delete this upload',
        });
        await connection.rollback();
        connection.release();
        continue;
      }

      // Prevent deletion of approved or partial uploads
      if (effectiveStatus === 'approved' || effectiveStatus === 'partial') {
        results.failed.push({
          id: uploadId,
          readable_id: upload.file_name || uploadId,
          name: upload.file_name || 'Unknown',
          reason:
            'Cannot delete approved uploads. Data has been moved to production and cannot be removed.',
        });
        await connection.rollback();
        connection.release();
        continue;
      }

      // Check if this upload has child versions (resubmissions)
      const [childVersions] = await connection.query(
        'SELECT id FROM data_uploads WHERE parent_upload_id = ?',
        [uploadId]
      );

      if (childVersions.length > 0) {
        results.failed.push({
          id: uploadId,
          readable_id: upload.file_name || uploadId,
          name: upload.file_name || 'Unknown',
          reason: `Cannot delete upload with ${childVersions.length} resubmitted version(s). Please delete child versions first.`,
        });
        await connection.rollback();
        connection.release();
        continue;
      }

      // All checks passed - CASCADE DELETE uploaded data

      // 1. Delete notifications related to this upload
      await connection.query(
        `DELETE FROM notifications 
         WHERE related_entity_type = 'data_upload' AND related_entity_id = ?`,
        [uploadId]
      );

      // 2. Delete uploaded_students (CASCADE as per requirement)
      await connection.query('DELETE FROM uploaded_students WHERE data_upload_id = ?', [uploadId]);

      // 3. Delete uploaded_batches
      await connection.query('DELETE FROM uploaded_batches WHERE data_upload_id = ?', [uploadId]);

      // 4. Delete uploaded_centers (CASCADE as per requirement)
      await connection.query('DELETE FROM uploaded_centers WHERE data_upload_id = ?', [uploadId]);

      // 5. Delete data_uploads (data_edit_logs will auto-cascade)
      await connection.query('DELETE FROM data_uploads WHERE id = ?', [uploadId]);

      // 6. Delete physical file if exists
      if (upload.file_url) {
        const fs = require('fs');
        const filePath = upload.file_url;

        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileError) {
            console.error(`Failed to delete file ${filePath}:`, fileError.message);
            // Continue anyway - database cleanup is more important
          }
        }
      }

      await connection.commit();

      results.success.push({
        id: uploadId,
        readable_id: upload.file_name || uploadId,
        name: upload.file_name || 'Unknown',
      });

      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();

      results.failed.push({
        id: uploadId,
        readable_id: uploadId,
        name: 'Unknown',
        reason: error.message,
      });
    }
  }

  results.summary.successful = results.success.length;
  results.summary.failed = results.failed.length;

  return results;
};

/**
 * Process upload CSV data into uploaded_centers, uploaded_batches, uploaded_students tables.
 * @param {string} partnerId
 * @param {string} uploadId
 * @param {Array} csvData  - pre-parsed array of row objects from CSV
 */
const processUpload = async (partnerId, uploadId, csvData) => {
  if (!csvData || csvData.length === 0) return { processed: 0 };

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Group rows by center_id
    const centerMap = {};
    for (const row of csvData) {
      if (!row.center_id || !row.student_id) {
        throw new Error('Missing required fields: center_id or student_id (partner_student_id)');
      }
      if (!centerMap[row.center_id]) {
        centerMap[row.center_id] = { info: row, batches: {} };
      }
      const batchKey = row.batch_number || 'DEFAULT';
      if (!centerMap[row.center_id].batches[batchKey]) {
        centerMap[row.center_id].batches[batchKey] = [];
      }
      centerMap[row.center_id].batches[batchKey].push(row);
    }

    for (const [csvCenterId, { info, batches }] of Object.entries(centerMap)) {
      const centerId = uuidv4();

      await connection.query(
        `INSERT INTO uploaded_centers (id, data_upload_id, csv_center_id, center_name, partner_id, review_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [centerId, uploadId, csvCenterId, info.center_name, partnerId]
      );

      for (const [batchNum, students] of Object.entries(batches)) {
        const [existingBatches] = await connection.query(
          'SELECT id FROM uploaded_batches WHERE uploaded_center_id = ? AND batch_number = ?',
          [centerId, batchNum]
        );

        let batchId;
        if (existingBatches.length === 0) {
          batchId = uuidv4();
          await connection.query(
            `INSERT INTO uploaded_batches (id, uploaded_center_id, data_upload_id, batch_number, review_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())`,
            [batchId, centerId, uploadId, batchNum]
          );
        } else {
          batchId = existingBatches[0].id;
        }

        for (const student of students) {
          await connection.query(
            `INSERT INTO uploaded_students (id, uploaded_center_id, uploaded_batch_id, data_upload_id, partner_id,
               partner_student_id, student_name, gender, course_name, batch_number, review_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
            [
              uuidv4(),
              centerId,
              batchId,
              uploadId,
              partnerId,
              student.student_id,
              student.student_name,
              student.gender,
              student.course_name,
              student.batch_number || batchNum,
            ]
          );
        }
      }
    }

    await connection.commit();
    return { processed: csvData.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get approval status for a center (checks if all batches are approved).
 */
const getCenterApprovalStatus = async (centerId) => {
  const connection = await db.getConnection();
  try {
    const [batches] = await connection.query(
      'SELECT id, review_status FROM uploaded_batches WHERE uploaded_center_id = ?',
      [centerId]
    );
    const allApproved = batches.length > 0 && batches.every((b) => b.review_status === 'approved');
    return allApproved
      ? { canApprove: true }
      : { canApprove: false, reason: 'not all batches are approved' };
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Create a V2 resubmission from an existing upload (soft-deletes V1).
 */
const createResubmission = async (parentUploadId, partnerId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const newUploadId = uuidv4();

    await connection.query(
      `INSERT INTO data_uploads (id, partner_id, parent_upload_id, version, status, created_at, updated_at)
       SELECT ?, partner_id, ?, COALESCE(version, 1) + 1, 'pending', NOW(), NOW()
       FROM data_uploads WHERE id = ?`,
      [newUploadId, parentUploadId, parentUploadId]
    );

    await connection.query(`UPDATE data_uploads SET deleted_at = NOW() WHERE id = ?`, [
      parentUploadId,
    ]);

    await connection.commit();
    return { id: newUploadId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllCourses,
  getPartnerById,
  getPartnerActiveCenters,
  checkDuplicateBatches,
  getNextVersionNumber,
  createDataUpload,
  saveUploadedData,
  createNotificationForAdmin,
  getPartnerUploads,
  getUploadDetails,
  getAllUploadsForAdmin,
  getUploadDetailsForAdmin,
  getBatchStudents,
  approveUpload,
  rejectUpload,
  resubmitWithEdits,
  deleteUpload,
  bulkDeleteUploads,
  processUpload,
  getCenterApprovalStatus,
  createResubmission,
  findDuplicateUpload,
};
