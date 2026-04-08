'use strict';

const db = require('../../../database/connection');
const { v4: uuidv4 } = require('uuid');

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

module.exports = { getSettings, updateInstruction, updateTemplateFile };
