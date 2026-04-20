const getUploadReviewCounts = async (connection, uploadId) => {
  const [rows] = await connection.query(
    `SELECT
      COUNT(*) as total_centers,
      SUM(
        CASE
          WHEN COALESCE(NULLIF(uc.review_status, ''), NULLIF(uc.approval_status, ''), 'pending') = 'approved'
          THEN 1 ELSE 0
        END
      ) as approved_centers,
      SUM(
        CASE
          WHEN COALESCE(NULLIF(uc.review_status, ''), NULLIF(uc.approval_status, ''), 'pending') = 'rejected'
          THEN 1 ELSE 0
        END
      ) as rejected_centers,
      SUM(
        CASE
          WHEN COALESCE(NULLIF(uc.review_status, ''), NULLIF(uc.approval_status, ''), 'pending') NOT IN ('approved', 'rejected')
          THEN 1 ELSE 0
        END
      ) as pending_centers
    FROM uploaded_centers uc
    WHERE uc.data_upload_id = ?`,
    [uploadId]
  );

  const counts = rows[0] || {};

  return {
    totalCenters: Number(counts.total_centers || 0),
    approvedCenters: Number(counts.approved_centers || 0),
    rejectedCenters: Number(counts.rejected_centers || 0),
    pendingCenters: Number(counts.pending_centers || 0),
  };
};

const deriveReviewProgress = (counts) => {
  if (counts.totalCenters === 0 || counts.pendingCenters === counts.totalCenters) {
    return 'not_started';
  }

  if (counts.pendingCenters > 0) {
    return 'in_progress';
  }

  return 'completed';
};

const deriveUploadStatus = (counts, fallbackStatus = 'pending') => {
  if (counts.totalCenters === 0) {
    return fallbackStatus;
  }

  if (counts.pendingCenters === counts.totalCenters) {
    return 'pending';
  }

  if (counts.pendingCenters > 0) {
    return 'partial';
  }

  if (counts.approvedCenters === counts.totalCenters) {
    return 'approved';
  }

  if (counts.rejectedCenters === counts.totalCenters) {
    return 'rejected';
  }

  if (counts.approvedCenters > 0 && counts.rejectedCenters > 0) {
    return 'partial';
  }

  return fallbackStatus;
};

const resolveEffectiveUploadStatus = async (connection, uploadId, fallbackStatus = 'pending') => {
  const counts = await getUploadReviewCounts(connection, uploadId);
  return deriveUploadStatus(counts, fallbackStatus);
};

const syncUploadLifecycle = async (
  connection,
  uploadId,
  reviewedBy = null,
  fallbackStatus = 'pending'
) => {
  const counts = await getUploadReviewCounts(connection, uploadId);
  const reviewProgress = deriveReviewProgress(counts);
  const status = deriveUploadStatus(counts, fallbackStatus);
  const centersReviewed = counts.approvedCenters + counts.rejectedCenters;

  await connection.query(
    `UPDATE data_uploads
     SET centers_total = ?,
         total_centers = ?,
         centers_reviewed = ?,
         centers_approved = ?,
         centers_rejected = ?,
         review_progress = ?,
         status = ?,
         reviewed_by = CASE
           WHEN ? IS NOT NULL AND ? <> 'not_started' THEN ?
           ELSE reviewed_by
         END,
         reviewed_at = CASE
           WHEN ? IS NOT NULL AND ? <> 'not_started' THEN NOW()
           ELSE reviewed_at
         END
     WHERE id = ?`,
    [
      counts.totalCenters,
      counts.totalCenters,
      centersReviewed,
      counts.approvedCenters,
      counts.rejectedCenters,
      reviewProgress,
      status,
      reviewedBy,
      reviewProgress,
      reviewedBy,
      reviewedBy,
      reviewProgress,
      uploadId,
    ]
  );

  return {
    ...counts,
    centersReviewed,
    reviewProgress,
    status,
  };
};

module.exports = {
  getUploadReviewCounts,
  deriveReviewProgress,
  deriveUploadStatus,
  resolveEffectiveUploadStatus,
  syncUploadLifecycle,
};
