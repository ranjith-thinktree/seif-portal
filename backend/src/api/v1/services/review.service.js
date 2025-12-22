const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');
const { convertToUUID } = require('../../../utils/uuid.util');

/**
 * Review Service
 * Handles center-wise review and approval of uploaded data
 */
class ReviewService {
  /**
   * Get upload details with review progress
   */
  async getUploadForReview(uploadId) {
    try {
      const uploadUuid = convertToUUID(uploadId);

      // Get upload details with partner info
      const uploads = await db.query(
        `SELECT 
          ud.*,
          p.name as partner_name,
          p.contact_person as partner_contact,
          u.full_name as uploaded_by_name
        FROM data_uploads ud
        LEFT JOIN partners p ON ud.partner_id = p.id
        LEFT JOIN users u ON ud.uploaded_by = u.id
        WHERE ud.id = ?`,
        [uploadUuid]
      );

      if (uploads.length === 0) {
        return null;
      }

      const upload = uploads[0];

      // Get review statistics
      const stats = await db.query(
        `SELECT 
          COUNT(*) as total_centers,
          SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved_centers,
          SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected_centers,
          SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending_centers
        FROM uploaded_centers
        WHERE data_upload_id = ?`,
        [uploadUuid]
      );

      upload.review_stats = stats[0];

      return upload;
    } catch (error) {
      console.error('Error in getUploadForReview:', error);
      throw error;
    }
  }

  /**
   * Get pending centers for an upload
   */
  async getPendingCenters(uploadId, { page = 1, limit = 10, search = '' }) {
    try {
      const uploadUuid = convertToUUID(uploadId);
      const offset = (page - 1) * limit;
      let whereConditions = ['uc.data_upload_id = ?'];
      let queryParams = [uploadUuid];

      // Search filter
      if (search) {
        whereConditions.push('(uc.center_name LIKE ? OR uc.city LIKE ? OR uc.state LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total 
        FROM uploaded_centers uc
        WHERE ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);
      const centers = await db.query(
        `SELECT 
          uc.*,
          u.full_name as reviewed_by_name,
          (SELECT COUNT(*) FROM uploaded_students WHERE uploaded_center_id = uc.id) as student_count
        FROM uploaded_centers uc
        LEFT JOIN users u ON uc.reviewed_by = u.id
        WHERE ${whereClause}
        ORDER BY 
          FIELD(uc.review_status, 'pending', 'approved', 'rejected'),
          uc.created_at DESC
        LIMIT ${validLimit} OFFSET ${validOffset}`,
        queryParams
      );

      return {
        data: centers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getPendingCenters:', error);
      throw error;
    }
  }

  /**
   * Get students for a specific center in upload
   */
  async getCenterStudentsForReview(uploadId, centerId, { page = 1, limit = 10, search = '' }) {
    try {
      const uploadUuid = convertToUUID(uploadId);
      const centerUuid = convertToUUID(centerId);
      const offset = (page - 1) * limit;

      let whereConditions = ['us.data_upload_id = ?', 'us.uploaded_center_id = ?'];
      let queryParams = [uploadUuid, centerUuid];

      // Search filter
      if (search) {
        whereConditions.push(
          '(us.partner_student_id LIKE ? OR us.student_name LIKE ? OR us.email LIKE ?)'
        );
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total 
        FROM uploaded_students us
        WHERE ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);
      const students = await db.query(
        `SELECT 
          us.*,
          uc.center_name,
          ub.batch_number
        FROM uploaded_students us
        LEFT JOIN uploaded_centers uc ON us.uploaded_center_id = uc.id
        LEFT JOIN uploaded_batches ub ON us.uploaded_batch_id = ub.id
        WHERE ${whereClause}
        ORDER BY us.partner_student_id
        LIMIT ${validLimit} OFFSET ${validOffset}`,
        queryParams
      );

      // Get center details
      const centerResult = await db.query(
        `SELECT 
          uc.*,
          (SELECT COUNT(*) FROM uploaded_students WHERE uploaded_center_id = uc.id) as student_count
        FROM uploaded_centers uc
        WHERE uc.id = ? AND uc.data_upload_id = ?`,
        [centerUuid, uploadUuid]
      );

      return {
        data: students,
        center: centerResult[0] || null,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getCenterStudentsForReview:', error);
      throw error;
    }
  }

  /**
   * Save admin edits to students (during initial review)
   * Saves to uploaded_students table and logs in data_edit_logs
   */
  async saveAdminEdits(uploadId, centerId, students, changes, adminUserId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const uploadUuid = convertToUUID(uploadId);
      const centerUuid = convertToUUID(centerId);
      const adminUuid = convertToUUID(adminUserId);

      // Verify center exists and belongs to upload
      const [centers] = await connection.query(
        `SELECT id FROM uploaded_centers 
         WHERE id = ? AND data_upload_id = ?`,
        [centerUuid, uploadUuid]
      );

      if (centers.length === 0) {
        throw new Error('Center not found in upload');
      }

      let updatedCount = 0;
      let loggedChanges = 0;

      // Update each edited student in uploaded_students
      for (const student of students) {
        const studentUuid = convertToUUID(student.id);

        // Update the student record
        const [updateResult] = await connection.query(
          `UPDATE uploaded_students SET
            partner_student_id = ?,
            student_name = ?,
            father_name = ?,
            mother_name = ?,
            gender = ?,
            email = ?,
            mobile_number = ?,
            alternate_mobile = ?,
            date_of_birth = ?,
            age = ?,
            course_name = ?,
            batch_number = ?,
            training_status = ?,
            is_edited = 1,
            updated_at = NOW()
          WHERE id = ? AND uploaded_center_id = ?`,
          [
            student.partner_student_id,
            student.student_name,
            student.father_name,
            student.mother_name,
            student.gender,
            student.email,
            student.mobile_number,
            student.alternate_mobile,
            student.date_of_birth,
            student.age,
            student.course_name,
            student.batch_number,
            student.training_status,
            studentUuid,
            centerUuid,
          ]
        );

        if (updateResult.affectedRows > 0) {
          updatedCount++;
        }
      }

      // Log changes in data_edit_logs with admin user ID
      for (const change of changes) {
        const studentUuid = convertToUUID(change.studentId);

        await connection.query(
          `INSERT INTO data_edit_logs 
          (student_id, field_name, old_value, new_value, edited_by, created_at) 
          VALUES (?, ?, ?, ?, ?, NOW())`,
          [studentUuid, change.field, change.oldValue || null, change.newValue || null, adminUuid]
        );
        loggedChanges++;
      }

      await connection.commit();

      return {
        updatedStudents: updatedCount,
        loggedChanges: loggedChanges,
        message: 'Admin edits saved successfully',
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error in saveAdminEdits:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Approve a center (moves center, batches, and students to main tables)
   */
  async approveCenter(uploadId, centerId, userId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const uploadUuid = convertToUUID(uploadId);
      const centerUuid = convertToUUID(centerId);
      const userUuid = convertToUUID(userId);

      // Get center details with actual partner_id from data_uploads
      const [centers] = await connection.query(
        `SELECT uc.*, du.partner_id as actual_partner_id 
         FROM uploaded_centers uc 
         JOIN data_uploads du ON uc.data_upload_id = du.id 
         WHERE uc.id = ? AND uc.data_upload_id = ? AND uc.review_status = ?`,
        [centerUuid, uploadUuid, 'pending']
      );

      if (centers.length === 0) {
        throw new Error('Center not found or already reviewed');
      }

      const center = centers[0];

      // Check if center already exists in production based on csv_center_id or center_name + partner_id
      const [existingCenters] = await connection.query(
        `SELECT id, center_id FROM centers 
         WHERE partner_id = ? AND (center_id = ? OR center_name = ?)
         LIMIT 1`,
        [center.partner_id, center.csv_center_id, center.center_name]
      );

      let approvedCenterId;
      let centerAction; // 'created' or 'updated'

      if (existingCenters.length > 0) {
        // Center already exists - UPDATE it instead of creating duplicate
        approvedCenterId = existingCenters[0].id;
        centerAction = 'updated';

        await connection.query(
          `UPDATE centers SET
            center_name = ?,
            center_type = ?,
            region = ?,
            city = ?,
            state = ?,
            address = ?,
            year_of_establishment = ?,
            center_head = ?,
            mobile_number = ?,
            email = ?,
            status = 'active',
            approval_status = 'approved',
            approved_by = ?,
            approved_at = NOW(),
            updated_at = NOW()
          WHERE id = ?`,
          [
            center.center_name,
            center.center_type,
            center.region,
            center.city,
            center.state,
            center.address,
            center.year_of_establishment,
            center.center_head,
            center.mobile_number,
            center.email,
            userUuid,
            approvedCenterId,
          ]
        );
      } else {
        // Center doesn't exist - INSERT new center
        approvedCenterId = uuidv4();
        centerAction = 'created';

        // Insert into main centers table
        await connection.query(
          `INSERT INTO centers (
            id, partner_id, center_name, center_type, region,
            city, state, address, year_of_establishment, 
            center_head, mobile_number, email, status, 
            approval_status, approved_by, approved_at,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
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
            center.center_head,
            center.mobile_number,
            center.email,
            'active',
            'approved',
            userUuid,
          ]
        );
      }

      // Get batches for this center
      const [batches] = await connection.query(
        'SELECT * FROM uploaded_batches WHERE uploaded_center_id = ? AND data_upload_id = ?',
        [centerUuid, uploadUuid]
      );

      // Insert batches and track mappings
      const batchIdMap = {};
      for (const batch of batches) {
        const approvedBatchId = uuidv4();
        batchIdMap[batch.id] = approvedBatchId;

        await connection.query(
          `INSERT INTO batches (
            id, center_id, partner_id, batch_number, batch_start_date,
            batch_complete_date, total_students, male_students, female_students,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            approvedBatchId,
            approvedCenterId,
            center.partner_id,
            batch.batch_number,
            batch.batch_start_date,
            batch.batch_complete_date,
            batch.total_students,
            batch.male_students,
            batch.female_students,
            'active',
          ]
        );

        // Update uploaded_batches
        await connection.query(
          `UPDATE uploaded_batches 
          SET review_status = ?, reviewed_by = ?, reviewed_at = NOW(), approved_batch_id = ?
          WHERE id = ?`,
          ['approved', userUuid, approvedBatchId, batch.id]
        );
      }

      // Get students for this center
      const [students] = await connection.query(
        'SELECT * FROM uploaded_students WHERE uploaded_center_id = ? AND data_upload_id = ?',
        [centerUuid, uploadUuid]
      );

      // Insert students
      for (const student of students) {
        const approvedStudentId = uuidv4();
        const approvedBatchId = batchIdMap[student.uploaded_batch_id];

        await connection.query(
          `INSERT INTO students (
            id, batch_id, center_id, partner_id, partner_student_id, student_name,
            date_of_birth, gender, mobile_number, email, address, city, state,
            enrollment_date, course_name, course_duration_months, training_status,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            approvedStudentId,
            approvedBatchId,
            approvedCenterId,
            center.partner_id,
            student.partner_student_id,
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
            student.training_status || 'enrolled',
          ]
        );

        // Update uploaded_students
        await connection.query(
          `UPDATE uploaded_students 
          SET review_status = ?, reviewed_by = ?, reviewed_at = NOW(), approved_student_id = ?
          WHERE id = ?`,
          ['approved', userUuid, approvedStudentId, student.id]
        );
      }

      // Update center review status
      await connection.query(
        `UPDATE uploaded_centers 
        SET review_status = ?, reviewed_by = ?, reviewed_at = NOW(), approved_center_id = ?
        WHERE id = ?`,
        ['approved', userUuid, approvedCenterId, centerUuid]
      );

      // Check if this is a resubmitted upload (version > 1)
      const [uploadInfo] = await connection.query(
        'SELECT version, parent_upload_id FROM data_uploads WHERE id = ?',
        [uploadUuid]
      );

      if (uploadInfo.length > 0 && uploadInfo[0].version > 1 && uploadInfo[0].parent_upload_id) {
        // This is a resubmission - check if center was rejected in parent
        const parentUploadId = uploadInfo[0].parent_upload_id;

        // Find the original center status
        const [parentCenter] = await connection.query(
          `SELECT review_status FROM uploaded_centers 
           WHERE data_upload_id = ? AND csv_center_id = ?`,
          [parentUploadId, center.csv_center_id]
        );

        // Only update parent if center was actually REJECTED (not if it was pending)
        if (parentCenter.length > 0 && parentCenter[0].review_status === 'rejected') {
          // Update the original rejected center to approved
          await connection.query(
            `UPDATE uploaded_centers 
            SET review_status = 'approved', 
                reviewed_by = ?, 
                reviewed_at = NOW(), 
                approved_center_id = ?
            WHERE data_upload_id = ? 
              AND csv_center_id = ? 
              AND review_status = 'rejected'`,
            [userUuid, approvedCenterId, parentUploadId, center.csv_center_id]
          );

          // Update batches status in original upload
          await connection.query(
            `UPDATE uploaded_batches ub
            INNER JOIN uploaded_centers uc ON ub.uploaded_center_id = uc.id
            SET ub.review_status = 'approved',
                ub.reviewed_by = ?,
                ub.reviewed_at = NOW()
            WHERE uc.data_upload_id = ?
              AND uc.csv_center_id = ?
              AND ub.review_status = 'rejected'`,
            [userUuid, parentUploadId, center.csv_center_id]
          );

          // Update students status in original upload
          await connection.query(
            `UPDATE uploaded_students us
            INNER JOIN uploaded_centers uc ON us.uploaded_center_id = uc.id
            SET us.review_status = 'approved',
                us.reviewed_by = ?,
                us.reviewed_at = NOW()
            WHERE uc.data_upload_id = ?
              AND uc.csv_center_id = ?
              AND us.review_status = 'rejected'`,
            [userUuid, parentUploadId, center.csv_center_id]
          );

          // Update parent upload progress counts
          // When approving a center that was REJECTED in parent:
          // - Increment centers_approved
          // - Decrement centers_rejected
          // - centers_reviewed stays the same (already counted)
          await connection.query(
            `UPDATE data_uploads 
            SET centers_approved = centers_approved + 1,
                centers_rejected = GREATEST(centers_rejected - 1, 0),
                review_progress = CASE 
                  WHEN centers_reviewed >= centers_total THEN 'completed'
                  ELSE review_progress
                END
            WHERE id = ?`,
            [parentUploadId]
          );
        }
        // If center was PENDING in parent, don't update parent counts at all
      }

      // Update upload progress for current upload
      // Increment both centers_reviewed and centers_approved to maintain constraint
      await connection.query(
        `UPDATE data_uploads 
         SET centers_reviewed = centers_reviewed + 1,
             centers_approved = centers_approved + 1,
             review_progress = CASE 
               WHEN centers_reviewed + 1 >= centers_total THEN 'completed'
               WHEN centers_reviewed + 1 > 0 THEN 'in_progress'
               ELSE review_progress
             END
         WHERE id = ?`,
        [uploadUuid]
      );

      // Check if all centers are reviewed
      const [uploadCheck] = await connection.query('SELECT * FROM data_uploads WHERE id = ?', [
        uploadId,
      ]);

      const allReviewed = uploadCheck[0].centers_reviewed >= uploadCheck[0].centers_total;

      // Create notification for partner user
      if (center.actual_partner_id) {
        // Get partner user ID from users table using partner_id
        const [partnerUsers] = await connection.query(
          'SELECT id FROM users WHERE partner_id = ? AND role = ? LIMIT 1',
          [center.actual_partner_id, 'PARTNER']
        );

        if (partnerUsers.length > 0) {
          const partnerUserId = partnerUsers[0].id;
          const notificationId = uuidv4();
          await connection.query(
            `INSERT INTO notifications (
              id, recipient_id, recipient_role, type, alert_type, title, message,
              related_entity_type, related_entity_id, sent_via, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              notificationId,
              partnerUserId,
              'PARTNER',
              'review',
              'success',
              allReviewed ? 'Upload Approved' : 'Center Approved',
              allReviewed
                ? `Your data upload has been fully approved. All centers and students are now active.`
                : `Center "${center.center_name}" has been approved and is now active.`,
              'data_upload',
              uploadId,
              'in_app',
            ]
          );
        }
      }

      await connection.commit();

      return {
        success: true,
        approvedCenterId,
        allReviewed,
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error in approveCenter:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Reject a center
   */
  async rejectCenter(uploadId, centerId, userId, reason, remarks) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const uploadUuid = convertToUUID(uploadId);
      const centerUuid = convertToUUID(centerId);
      const userUuid = convertToUUID(userId);

      // Get center details with actual partner_id from data_uploads
      const [centers] = await connection.query(
        `SELECT uc.*, du.partner_id as actual_partner_id 
         FROM uploaded_centers uc 
         JOIN data_uploads du ON uc.data_upload_id = du.id 
         WHERE uc.id = ? AND uc.data_upload_id = ? AND uc.review_status = ?`,
        [centerUuid, uploadUuid, 'pending']
      );

      if (centers.length === 0) {
        throw new Error('Center not found or already reviewed');
      }

      const center = centers[0];

      // Mark center as rejected
      await connection.query(
        `UPDATE uploaded_centers 
        SET review_status = ?, rejection_reason = ?, rejection_remarks = ?,
            reviewed_by = ?, reviewed_at = NOW()
        WHERE id = ?`,
        ['rejected', reason, remarks, userUuid, centerUuid]
      );

      // Update batches status
      await connection.query(
        `UPDATE uploaded_batches 
        SET review_status = ?, reviewed_by = ?, reviewed_at = NOW()
        WHERE uploaded_center_id = ? AND data_upload_id = ?`,
        ['rejected', userUuid, centerUuid, uploadUuid]
      );

      // Update students status
      await connection.query(
        `UPDATE uploaded_students 
        SET review_status = ?, reviewed_by = ?, reviewed_at = NOW()
        WHERE uploaded_center_id = ? AND data_upload_id = ?`,
        ['rejected', userUuid, centerUuid, uploadUuid]
      );

      // Update upload progress
      await connection.query(
        `UPDATE data_uploads 
         SET centers_reviewed = centers_reviewed + 1,
             centers_rejected = centers_rejected + 1,
             review_progress = CASE 
               WHEN centers_reviewed + 1 >= centers_total THEN 'completed'
               ELSE 'in_progress'
             END
         WHERE id = ?`,
        [uploadId]
      );

      // Create notification for partner user
      if (center.actual_partner_id) {
        // Get partner user ID from users table using partner_id
        const [partnerUsers] = await connection.query(
          'SELECT id FROM users WHERE partner_id = ? AND role = ? LIMIT 1',
          [center.actual_partner_id, 'PARTNER']
        );

        if (partnerUsers.length > 0) {
          const partnerUserId = partnerUsers[0].id;
          const notificationId = uuidv4();
          await connection.query(
            `INSERT INTO notifications (
              id, recipient_id, recipient_role, type, alert_type, title, message, remark,
              related_entity_type, related_entity_id, sent_via, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              notificationId,
              partnerUserId,
              'PARTNER',
              'review',
              'error',
              'Center Rejected',
              `Center "${center.center_name}" has been rejected. Reason: ${reason}`,
              remarks,
              'data_upload',
              uploadId,
              'in_app',
            ]
          );
        }
      }

      await connection.commit();

      return {
        success: true,
        centerUuid,
      };
    } catch (error) {
      await connection.rollback();
      console.error('Error in rejectCenter:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get rejected centers for partner
   */
  async getRejectedCentersForPartner(uploadId, partnerId) {
    try {
      const uploadUuid = convertToUUID(uploadId);
      const partnerUuid = convertToUUID(partnerId);

      // Get upload details
      const uploads = await db.query(`SELECT * FROM data_uploads WHERE id = ? AND partner_id = ?`, [
        uploadUuid,
        partnerUuid,
      ]);

      if (uploads.length === 0) {
        return null;
      }

      // Get rejected centers
      const centers = await db.query(
        `SELECT 
          uc.*,
          u.full_name as reviewed_by_name,
          (SELECT COUNT(*) FROM uploaded_students WHERE uploaded_center_id = uc.id) as student_count
        FROM uploaded_centers uc
        LEFT JOIN users u ON uc.reviewed_by = u.id
        WHERE uc.data_upload_id = ? AND uc.review_status = 'rejected'
        ORDER BY uc.reviewed_at DESC`,
        [uploadUuid]
      );

      return {
        upload: uploads[0],
        centers,
      };
    } catch (error) {
      console.error('Error in getRejectedCentersForPartner:', error);
      throw error;
    }
  }

  /**
   * Get upload details for partner review/edit
   * Returns upload with all centers and their review status
   */
  async getUploadForPartnerReview(uploadId, partnerId) {
    try {
      const uploadUuid = convertToUUID(uploadId);
      const partnerUuid = convertToUUID(partnerId);

      // Get upload details
      const uploads = await db.query(
        `SELECT 
          ud.*,
          p.name as partner_name
        FROM data_uploads ud
        LEFT JOIN partners p ON ud.partner_id = p.id
        WHERE ud.id = ? AND ud.partner_id = ?`,
        [uploadUuid, partnerUuid]
      );

      if (uploads.length === 0) {
        return null;
      }

      // Get all centers with their review status
      const centers = await db.query(
        `SELECT 
          uc.*,
          u.full_name as reviewed_by_name,
          (SELECT COUNT(*) FROM uploaded_students WHERE uploaded_center_id = uc.id) as student_count
        FROM uploaded_centers uc
        LEFT JOIN users u ON uc.reviewed_by = u.id
        WHERE uc.data_upload_id = ?
        ORDER BY 
          CASE uc.review_status 
            WHEN 'rejected' THEN 1 
            WHEN 'pending' THEN 2 
            WHEN 'approved' THEN 3 
          END,
          uc.center_name`,
        [uploadUuid]
      );

      return {
        upload: uploads[0],
        centers,
      };
    } catch (error) {
      console.error('Error in getUploadForPartnerReview:', error);
      throw error;
    }
  }

  /**
   * NEW: Get pending centers for approval (from centers table)
   * Tab 1 - Center Approval
   */
  async getPendingCentersForApproval({ page = 1, limit = 10, search = '', partner_id = '' }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = ["c.approval_status = 'pending'"];
      let queryParams = [];

      // Filter by partner if provided
      if (partner_id) {
        whereConditions.push('c.partner_id = ?');
        queryParams.push(convertToUUID(partner_id));
      }

      // Search filter
      if (search) {
        whereConditions.push('(c.center_name LIKE ? OR c.city LIKE ? OR c.state LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total 
        FROM centers c
        WHERE ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);
      const centers = await db.query(
        `SELECT 
          c.*,
          p.name as partner_name,
          u.full_name as created_by_name
        FROM centers c
        LEFT JOIN partners p ON c.partner_id = p.id
        LEFT JOIN users u ON u.partner_id = c.partner_id AND u.role = 'PARTNER'
        WHERE ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT ${validLimit} OFFSET ${validOffset}`,
        queryParams
      );

      return {
        data: centers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getPendingCentersForApproval:', error);
      throw error;
    }
  }

  /**
   * NEW: Approve center (from centers table)
   * Changes approval_status from 'pending' to 'approved'
   */
  async approveCenterDirect(centerId, userId) {
    try {
      const centerUuid = convertToUUID(centerId);
      const userUuid = convertToUUID(userId);

      // Check if center exists and is pending
      const [centers] = await db.query(
        `SELECT * FROM centers WHERE id = ? AND approval_status = 'pending'`,
        [centerUuid]
      );

      if (centers.length === 0) {
        throw new Error('Center not found or already reviewed');
      }

      const center = centers[0];

      // Update status to approved
      await db.query(
        `UPDATE centers 
         SET approval_status = 'approved',
             approved_by = ?,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [userUuid, centerUuid]
      );

      // Send notification to partner
      const [partnerUsers] = await db.query(
        'SELECT id FROM users WHERE partner_id = ? AND role = ? LIMIT 1',
        [center.partner_id, 'PARTNER']
      );

      if (partnerUsers.length > 0) {
        const notificationId = uuidv4();
        await db.query(
          `INSERT INTO notifications (
            id, recipient_id, recipient_role, type, alert_type, title, message,
            related_entity_type, related_entity_id, sent_via, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            notificationId,
            partnerUsers[0].id,
            'PARTNER',
            'review',
            'success',
            'Center Approved',
            `Your center "${center.center_name}" has been approved. You can now upload student data for this center.`,
            'center',
            centerId,
            'in_app',
          ]
        );
      }

      return { success: true, center_id: centerId };
    } catch (error) {
      console.error('Error in approveCenterDirect:', error);
      throw error;
    }
  }

  /**
   * NEW: Reject center (from centers table)
   */
  async rejectCenterDirect(centerId, userId, reason, remarks) {
    try {
      const centerUuid = convertToUUID(centerId);
      const userUuid = convertToUUID(userId);

      // Check if center exists
      const [centers] = await db.query(
        `SELECT * FROM centers WHERE id = ? AND approval_status = 'pending'`,
        [centerUuid]
      );

      if (centers.length === 0) {
        throw new Error('Center not found or already reviewed');
      }

      const center = centers[0];

      // Update status to rejected
      await db.query(
        `UPDATE centers 
         SET approval_status = 'rejected',
             approved_by = ?,
             approved_at = NOW(),
             rejection_reason = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [userUuid, reason, centerUuid]
      );

      // Send notification to partner
      const [partnerUsers] = await db.query(
        'SELECT id FROM users WHERE partner_id = ? AND role = ? LIMIT 1',
        [center.partner_id, 'PARTNER']
      );

      if (partnerUsers.length > 0) {
        const notificationId = uuidv4();
        await db.query(
          `INSERT INTO notifications (
            id, recipient_id, recipient_role, type, alert_type, title, message,
            related_entity_type, related_entity_id, sent_via, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            notificationId,
            partnerUsers[0].id,
            'PARTNER',
            'review',
            'error',
            'Center Rejected',
            `Your center "${center.center_name}" has been rejected. Reason: ${reason}`,
            'center',
            centerId,
            'in_app',
          ]
        );
      }

      return { success: true, center_id: centerId };
    } catch (error) {
      console.error('Error in rejectCenterDirect:', error);
      throw error;
    }
  }

  /**
   * NEW: Get pending data uploads (batches/students awaiting approval)
   * Tab 2 - Data Upload Approval
   */
  async getPendingDataUploads({ page = 1, limit = 10, search = '', partner_id = '' }) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = ["du.status = 'pending'"];
      let queryParams = [];

      // Filter by partner if provided
      if (partner_id) {
        whereConditions.push('du.partner_id = ?');
        queryParams.push(convertToUUID(partner_id));
      }

      // Search filter
      if (search) {
        whereConditions.push('(du.file_name LIKE ? OR p.name LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total 
        FROM data_uploads du
        LEFT JOIN partners p ON du.partner_id = p.id
        WHERE ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Get paginated data
      const validLimit = parseInt(limit);
      const validOffset = parseInt(offset);
      const uploads = await db.query(
        `SELECT 
          du.*,
          p.name as partner_name,
          u.full_name as uploaded_by_name,
          (SELECT COUNT(*) FROM uploaded_batches WHERE data_upload_id = du.id) as total_batches_uploaded,
          (SELECT COUNT(*) FROM uploaded_students WHERE data_upload_id = du.id) as total_students_uploaded
        FROM data_uploads du
        LEFT JOIN partners p ON du.partner_id = p.id
        LEFT JOIN users u ON du.uploaded_by = u.id
        WHERE ${whereClause}
        ORDER BY du.created_at DESC
        LIMIT ${validLimit} OFFSET ${validOffset}`,
        queryParams
      );

      return {
        data: uploads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error in getPendingDataUploads:', error);
      throw error;
    }
  }
}

module.exports = new ReviewService();
