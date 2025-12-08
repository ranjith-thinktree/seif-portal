const pool = require('../../../database/connection').pool;
const { v4: uuidv4 } = require('uuid');

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

    // Iterate through centers
    for (const [csvCenterId, centerData] of centerMap) {
      totalCenters++;

      // Fetch existing center details from approved centers
      const [existingCenters] = await connection.query(
        `SELECT id, name, center_type, region, city, state, address, 
                year_of_establishment, status, center_head, mobile_number, email 
         FROM centers 
         WHERE partner_id = ? AND (id = ? OR name LIKE ?) AND approval_status = 'approved'
         LIMIT 1`,
        [partnerId, csvCenterId, `%${csvCenterId}%`]
      );

      let centerDetails;
      if (existingCenters.length > 0) {
        centerDetails = existingCenters[0];
      } else {
        // Center not found - this will be flagged during admin review
        console.warn(`Center ${csvCenterId} not found for partner ${partnerId}`);
        centerDetails = {
          name: csvCenterId, // Use CSV ID as placeholder name
          center_type: null,
          region: null,
          city: null,
          state: null,
          address: null,
          year_of_establishment: null,
          status: 'active',
          center_head: null,
          mobile_number: null,
          email: null,
        };
      }

      // Generate UUID for uploaded center
      const uploadedCenterId = (await connection.query('SELECT UUID() as id'))[0][0].id;

      // Insert center with fetched details
      await connection.query(
        `INSERT INTO uploaded_centers 
        (id, data_upload_id, partner_id, csv_center_id, center_name, center_type, region, 
         city, state, address, year_of_establishment, status, center_head, 
         mobile_number, email, approval_status, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          uploadedCenterId,
          dataUploadId,
          partnerId,
          csvCenterId,
          centerDetails.name,
          centerDetails.center_type,
          centerDetails.region,
          centerDetails.city,
          centerDetails.state,
          centerDetails.address,
          centerDetails.year_of_establishment,
          centerDetails.status,
          centerDetails.center_head,
          centerDetails.mobile_number,
          centerDetails.email,
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

        // Insert batch with auto-calculated counts
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
            uploadedCenterId,
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
          totalStudents++;
          const studentUuid = (await connection.query('SELECT UUID() as id'))[0][0].id;

          // Use batch start date as enrollment date if not provided
          const enrollmentDate = student.enrollment_date || batchData.batchData.batch_start_date;

          await connection.query(
            `INSERT INTO uploaded_students 
            (id, data_upload_id, csv_center_id, uploaded_batch_id, uploaded_center_id, 
             partner_id, student_id, student_name, father_name, date_of_birth, gender, 
             mobile_number, email, qualification, address, city, state, district,
             enrollment_date, course_name, course_duration_months, training_status, 
             approval_status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
              studentUuid,
              dataUploadId,
              csvCenterId,
              uploadedBatchId,
              uploadedCenterId,
              partnerId,
              student.student_id,
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
              enrollmentDate,
              student.course_name,
              student.course_duration_months,
              student.training_status,
            ]
          );
        }
      }
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
const getPartnerUploads = async (partnerId, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    const [uploads] = await pool.query(
      `SELECT 
        du.id, du.file_name, du.file_url, du.total_records, 
        du.status, du.rejection_reason, du.remarks,
        du.created_at, du.reviewed_at,
        u.full_name as uploaded_by_name,
        r.full_name as reviewed_by_name
      FROM data_uploads du
      LEFT JOIN users u ON du.uploaded_by = u.id
      LEFT JOIN users r ON du.reviewed_by = r.id
      WHERE du.partner_id = ?
      ORDER BY du.created_at DESC
      LIMIT ? OFFSET ?`,
      [partnerId, limit, offset]
    );

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM data_uploads WHERE partner_id = ?',
      [partnerId]
    );

    return {
      uploads,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch uploads: ${error.message}`);
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
        us.student_name, us.gender, us.course_name, us.training_status,
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
const getAllUploadsForAdmin = async (status = null, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE du.status = ?';
      params.push(status);
    }

    params.push(limit, offset);

    const [uploads] = await pool.query(
      `SELECT 
        du.id, du.file_name, du.total_records, du.status,
        du.created_at, du.reviewed_at,
        p.name as partner_name,
        u.full_name as uploaded_by_name
      FROM data_uploads du
      LEFT JOIN partners p ON du.partner_id = p.id
      LEFT JOIN users u ON du.uploaded_by = u.id
      ${whereClause}
      ORDER BY 
        CASE WHEN du.status = 'pending' THEN 1 ELSE 2 END,
        du.created_at DESC
      LIMIT ? OFFSET ?`,
      params
    );

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM data_uploads du ${whereClause}`,
      status ? [status] : []
    );

    return {
      uploads,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
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

    // Get paginated students
    const [students] = await pool.query(
      `SELECT * FROM uploaded_students 
       WHERE uploaded_batch_id = ? 
       ORDER BY student_id 
       LIMIT ? OFFSET ?`,
      [batchId, limit, offset]
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

    for (const center of centers) {
      // Generate UUID for the new center
      const approvedCenterId = uuidv4();

      // Insert into production centers table
      await connection.query(
        `INSERT INTO centers 
        (id, partner_id, center_name, center_type, region, city, state, address, 
         year_of_establishment, status, center_head, mobile_number, email, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          approvedCenterId,
          center.partner_id,
          center.center_name,
          center.center_type,
          center.region,
          center.city,
          center.state,
          center.address,
          center.year_of_establishment,
          center.status,
          center.center_head,
          center.mobile_number,
          center.email,
        ]
      );

      // Update uploaded_centers with approved_center_id
      await connection.query(
        'UPDATE uploaded_centers SET approval_status = ?, approved_center_id = ? WHERE id = ?',
        ['approved', approvedCenterId, center.id]
      );

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

          await connection.query(
            `INSERT INTO students 
            (id, center_id, batch_id, partner_id, student_id, student_name, date_of_birth, 
             gender, mobile_number, email, address, city, state, enrollment_date, 
             course_name, course_duration_months, training_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              approvedStudentId,
              approvedCenterId,
              approvedBatchId,
              student.partner_id,
              student.student_id,
              student.student_name,
              student.date_of_birth,
              student.gender,
              student.mobile_number,
              student.email,
              student.address,
              student.city,
              student.state,
              student.enrollment_date,
              student.course_name,
              student.course_duration_months,
              student.training_status,
            ]
          );

          // Update uploaded_students with approved_student_id
          await connection.query(
            'UPDATE uploaded_students SET approval_status = ?, approved_student_id = ? WHERE id = ?',
            ['approved', approvedStudentId, student.id]
          );
        }
      }
    }

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

      // Insert student record
      await connection.query(
        `INSERT INTO uploaded_students 
        (id, data_upload_id, uploaded_center_id, center_id, student_name, gender, date_of_birth,
         mobile_number, email, father_name, mother_name, address, qualification,
         batch_number, batch_start_date, batch_completion_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          newStudentId,
          newUploadId,
          newCenter[0].id,
          studentData.center_id,
          studentData.student_name,
          studentData.gender,
          studentData.date_of_birth,
          studentData.mobile_number,
          studentData.email,
          studentData.father_name,
          studentData.mother_name,
          studentData.address,
          studentData.qualification,
          studentData.batch_number,
          studentData.batch_start_date,
          studentData.batch_completion_date,
        ]
      );

      // Log edits if this student was modified
      if (editedStudent) {
        const fieldsToCheck = [
          'student_name',
          'gender',
          'date_of_birth',
          'mobile_number',
          'email',
          'father_name',
          'mother_name',
          'address',
          'qualification',
          'batch_number',
          'batch_start_date',
          'batch_completion_date',
        ];

        for (const field of fieldsToCheck) {
          if (originalStudent[field] !== editedStudent[field]) {
            await connection.query(
              `INSERT INTO data_edit_logs 
              (id, upload_id, original_upload_id, student_id, field_name, old_value, new_value, edited_by, created_at)
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

module.exports = {
  getAllCourses,
  getPartnerById,
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
};
