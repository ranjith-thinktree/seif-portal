const pool = require('../../../database/connection').pool;
const { v4: uuidv4 } = require('uuid');

/**
 * Support Contacts Service
 * CRUD for the Help > Support tab contact cards
 */

const getAll = async () => {
  const [rows] = await pool.query(
    `SELECT sc.*, u.full_name as created_by_name
     FROM support_contacts sc
     LEFT JOIN users u ON sc.created_by = u.id
     WHERE sc.deleted_at IS NULL
     ORDER BY sc.order_index, sc.created_at ASC`
  );
  return rows;
};

const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM support_contacts WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
};

const create = async (data, createdBy) => {
  const id = uuidv4();
  const { name, title, email, phone, whatsapp, description, avatar_initials, order_index } = data;
  await pool.query(
    `INSERT INTO support_contacts
      (id, name, title, email, phone, whatsapp, description, avatar_initials, order_index, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      title || null,
      email || null,
      phone || null,
      whatsapp || null,
      description || null,
      avatar_initials || null,
      order_index ?? 0,
      createdBy,
    ]
  );
  return getById(id);
};

const update = async (id, data) => {
  const { name, title, email, phone, whatsapp, description, avatar_initials, order_index } = data;
  await pool.query(
    `UPDATE support_contacts
     SET name=?, title=?, email=?, phone=?, whatsapp=?, description=?, avatar_initials=?, order_index=?
     WHERE id=? AND deleted_at IS NULL`,
    [
      name,
      title || null,
      email || null,
      phone || null,
      whatsapp || null,
      description || null,
      avatar_initials || null,
      order_index ?? 0,
      id,
    ]
  );
  return getById(id);
};

const remove = async (id) => {
  await pool.query(
    `UPDATE support_contacts SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
};

module.exports = { getAll, getById, create, update, remove };
