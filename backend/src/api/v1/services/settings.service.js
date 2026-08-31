'use strict';

const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');

let performanceRatingTableReady;

const ensurePerformanceRatingTable = async () => {
  if (!performanceRatingTableReady) {
    performanceRatingTableReady = db
      .query(`
        CREATE TABLE IF NOT EXISTS performance_rating_settings (
          id CHAR(36) NOT NULL,
          min_score INT NOT NULL,
          max_score INT DEFAULT NULL,
          stars TINYINT NOT NULL,
          rating TINYINT NOT NULL,
          created_by CHAR(36) DEFAULT NULL,
          updated_by CHAR(36) DEFAULT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_performance_rating_min_score (min_score)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      .then(() =>
        db.query(`
          INSERT IGNORE INTO performance_rating_settings
            (id, min_score, max_score, stars, rating)
          VALUES
            (UUID(), 0, 50, 1, 1),
            (UUID(), 51, 75, 2, 2),
            (UUID(), 76, 100, 3, 3),
            (UUID(), 101, 150, 4, 4),
            (UUID(), 151, NULL, 5, 5)
        `)
      )
      .catch((error) => {
        performanceRatingTableReady = null;
        throw error;
      });
  }
  await performanceRatingTableReady;
};

const normalizeRatingRange = (payload) => {
  payload = payload || {};
  const minScore = Number(payload.minScore);
  const maxScore =
    payload.maxScore === null || payload.maxScore === '' || payload.maxScore === undefined
      ? null
      : Number(payload.maxScore);
  const stars = Number(payload.stars);
  const rating = Number(payload.rating);

  if (!Number.isInteger(minScore) || minScore < 0) {
    throw new Error('minScore must be a non-negative integer.');
  }
  if (maxScore !== null && (!Number.isInteger(maxScore) || maxScore < minScore)) {
    throw new Error('maxScore must be empty or an integer greater than or equal to minScore.');
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error('stars must be an integer from 1 to 5.');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('rating must be an integer from 1 to 5.');
  }

  return { minScore, maxScore, stars, rating };
};

/**
 * Fetch all portal settings as a key→value map.
 * @returns {Promise<Object>} e.g. { student_data_instructions: '...', ... }
 */
const getSettings = async () => {
  const [rows] = await db.query(
    'SELECT setting_key, setting_value, file_url, file_name, updated_at FROM portal_settings'
  );
  const result = {};
  for (const row of rows) {
    result[row.setting_key] = {
      value: row.setting_value,
      file_url: row.file_url,
      file_name: row.file_name,
      updated_at: row.updated_at,
    };
  }
  return result;
};

/**
 * Update an instruction text value.
 * @param {string} key
 * @param {string} value
 * @param {string} adminId
 */
const updateInstruction = async (key, value, adminId) => {
  const [res] = await db.query(
    `UPDATE portal_settings
        SET setting_value = ?, updated_by = ?, updated_at = NOW()
      WHERE setting_key = ?`,
    [value, adminId, key]
  );
  if (res.affectedRows === 0) throw new Error(`Setting key '${key}' not found.`);
};

/**
 * Update a template file URL/name.
 * @param {string} key
 * @param {string} fileUrl
 * @param {string} fileName
 * @param {string} adminId
 */
const updateTemplateFile = async (key, fileUrl, fileName, adminId) => {
  const [res] = await db.query(
    `UPDATE portal_settings
        SET file_url = ?, file_name = ?, updated_by = ?, updated_at = NOW()
      WHERE setting_key = ?`,
    [fileUrl, fileName, adminId, key]
  );
  if (res.affectedRows === 0) throw new Error(`Setting key '${key}' not found.`);
};

const ensureRatingRangeDoesNotOverlap = async (range, excludeId = null) => {
  await ensurePerformanceRatingTable();
  const [rows] = await db.query(
    `SELECT id, min_score, max_score
       FROM performance_rating_settings
      WHERE (? IS NULL OR id <> ?)
        AND (max_score IS NULL OR ? <= max_score)
        AND (? IS NULL OR min_score <= ?)`,
    [excludeId, excludeId, range.maxScore, range.minScore, range.maxScore]
  );

  if (rows.length > 0) {
    throw new Error('The score range overlaps an existing performance rating range.');
  }
};

const getPerformanceRatingSettings = async () => {
  await ensurePerformanceRatingTable();
  const [rows] = await db.query(
    `SELECT id, min_score AS minScore, max_score AS maxScore, stars, rating,
            created_at AS createdAt, updated_at AS updatedAt
       FROM performance_rating_settings
      ORDER BY min_score ASC`
  );
  return rows;
};

const createPerformanceRatingSetting = async (payload, adminId) => {
  await ensurePerformanceRatingTable();
  const range = normalizeRatingRange(payload);
  await ensureRatingRangeDoesNotOverlap(range);
  const id = uuidv4();
  await db.query(
    `INSERT INTO performance_rating_settings
       (id, min_score, max_score, stars, rating, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, range.minScore, range.maxScore, range.stars, range.rating, adminId, adminId]
  );
  return { id, ...range };
};

const updatePerformanceRatingSetting = async (id, payload, adminId) => {
  await ensurePerformanceRatingTable();
  const range = normalizeRatingRange(payload);
  const [existing] = await db.query(
    'SELECT id FROM performance_rating_settings WHERE id = ?',
    [id]
  );
  if (!existing.length) {
    throw new Error('Performance rating setting not found.');
  }
  await ensureRatingRangeDoesNotOverlap(range, id);
  await db.query(
    `UPDATE performance_rating_settings
        SET min_score = ?, max_score = ?, stars = ?, rating = ?,
            updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [range.minScore, range.maxScore, range.stars, range.rating, adminId, id]
  );
  return { id, ...range };
};

const deletePerformanceRatingSetting = async (id) => {
  await ensurePerformanceRatingTable();
  const [result] = await db.query(
    'DELETE FROM performance_rating_settings WHERE id = ?',
    [id]
  );
  if (!result.affectedRows) {
    throw new Error('Performance rating setting not found.');
  }
};

module.exports = {
  getSettings,
  updateInstruction,
  updateTemplateFile,
  getPerformanceRatingSettings,
  createPerformanceRatingSetting,
  updatePerformanceRatingSetting,
  deletePerformanceRatingSetting,
};
