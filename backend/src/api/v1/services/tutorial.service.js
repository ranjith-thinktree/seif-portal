const pool = require('../../../database/connection').pool;
const { v4: uuidv4 } = require('uuid');
const { generatePresignedUrl, generatePutPresignedUrl } = require('../../../utils/s3.util');

/**
 * Tutorial Video Service
 * CRUD operations for user manual / tutorial videos
 */

/**
 * Get all tutorial videos (optionally filtered by role)
 */
const getAllTutorials = async (role = null) => {
  let query = `
    SELECT tv.*, u.full_name as created_by_name
    FROM tutorial_videos tv
    LEFT JOIN users u ON tv.created_by = u.id
    WHERE tv.deleted_at IS NULL
  `;
  const params = [];

  if (role && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
    query += ` AND (tv.role_audience IS NULL OR JSON_CONTAINS(tv.role_audience, ?))`;
    params.push(JSON.stringify(role));
  }

  query += ` ORDER BY tv.section, tv.order_index, tv.created_at DESC`;

  const [rows] = await pool.query(query, params);

  // Generate presigned URLs for viewing
  for (const row of rows) {
    if (row.s3_key) {
      try {
        row.stream_url = await generatePresignedUrl(row.s3_key, 3600);
      } catch {
        row.stream_url = row.video_url;
      }
    } else {
      row.stream_url = row.video_url;
    }
    if (row.role_audience && typeof row.role_audience === 'string') {
      row.role_audience = JSON.parse(row.role_audience);
    }
  }

  return rows;
};

/**
 * Get a single tutorial by ID
 */
const getTutorialById = async (id) => {
  const [rows] = await pool.query(
    `SELECT tv.*, u.full_name as created_by_name
     FROM tutorial_videos tv
     LEFT JOIN users u ON tv.created_by = u.id
     WHERE tv.id = ? AND tv.deleted_at IS NULL`,
    [id]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  if (row.s3_key) {
    try {
      row.stream_url = await generatePresignedUrl(row.s3_key, 3600);
    } catch {
      row.stream_url = row.video_url;
    }
  } else {
    row.stream_url = row.video_url;
  }
  if (row.role_audience && typeof row.role_audience === 'string') {
    row.role_audience = JSON.parse(row.role_audience);
  }
  return row;
};

/**
 * Generate a presigned PUT URL for video upload to S3
 */
const getUploadUrl = async (fileName, contentType) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const s3Key = `tutorials/${uuidv4()}.${ext}`;
  const { uploadUrl, fileUrl } = await generatePutPresignedUrl(s3Key, contentType, 600);
  return { uploadUrl, fileUrl, s3Key };
};

/**
 * Create a new tutorial record (after video has been uploaded to S3)
 */
const createTutorial = async (data, createdBy) => {
  const id = uuidv4();
  const { title, description, video_url, s3_key, section, role_audience, order_index } = data;

  await pool.query(
    `INSERT INTO tutorial_videos 
      (id, title, description, video_url, s3_key, section, role_audience, order_index, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      description || null,
      video_url,
      s3_key || null,
      section || 'general',
      role_audience ? JSON.stringify(role_audience) : null,
      order_index || 0,
      createdBy,
    ]
  );

  return getTutorialById(id);
};

/**
 * Update tutorial metadata
 */
const updateTutorial = async (id, data) => {
  const { title, description, section, role_audience, order_index } = data;
  const fields = [];
  const params = [];

  if (title !== undefined) {
    fields.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    fields.push('description = ?');
    params.push(description);
  }
  if (section !== undefined) {
    fields.push('section = ?');
    params.push(section);
  }
  if (role_audience !== undefined) {
    fields.push('role_audience = ?');
    params.push(JSON.stringify(role_audience));
  }
  if (order_index !== undefined) {
    fields.push('order_index = ?');
    params.push(order_index);
  }

  if (fields.length === 0) return getTutorialById(id);

  params.push(id);
  await pool.query(`UPDATE tutorial_videos SET ${fields.join(', ')} WHERE id = ?`, params);
  return getTutorialById(id);
};

/**
 * Soft-delete a tutorial
 */
const deleteTutorial = async (id) => {
  await pool.query(`UPDATE tutorial_videos SET deleted_at = NOW() WHERE id = ?`, [id]);
};

module.exports = {
  getAllTutorials,
  getTutorialById,
  getUploadUrl,
  createTutorial,
  updateTutorial,
  deleteTutorial,
};
