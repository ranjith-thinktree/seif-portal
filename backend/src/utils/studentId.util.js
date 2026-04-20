const normalizeToken = (value, length) => {
  const sanitized = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  return sanitized.slice(0, length).padEnd(length, 'X');
};

const formatDateToken = (value) => {
  if (!value) return '00000000';

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}${isoMatch[2]}${isoMatch[3]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '00000000';
  }

  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('');
};

const buildBaseStudentIdentifier = (student) => {
  return [
    normalizeToken(student.student_name, 3),
    normalizeToken(student.father_name, 3),
    formatDateToken(student.date_of_birth),
    normalizeToken(student.course_name, 4),
  ].join('');
};

const resolveNextIdentifier = (baseId, existingIds) => {
  const taken = new Set(existingIds.filter(Boolean));

  if (!taken.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (taken.has(`${baseId}-${String(suffix).padStart(2, '0')}`)) {
    suffix += 1;
  }

  return `${baseId}-${String(suffix).padStart(2, '0')}`;
};

const generateUniqueStudentIdentifier = async (connection, partnerId, student, options = {}) => {
  const baseId = buildBaseStudentIdentifier(student);
  const uploadedStudentId = options.uploadedStudentId || null;

  const [studentRows] = await connection.query(
    `SELECT partner_student_id
     FROM students
     WHERE partner_id = ?
       AND partner_student_id IS NOT NULL
       AND partner_student_id LIKE ?`,
    [partnerId, `${baseId}%`]
  );

  const [uploadedRows] = await connection.query(
    `SELECT partner_student_id
     FROM uploaded_students
     WHERE partner_id = ?
       AND partner_student_id IS NOT NULL
       AND partner_student_id LIKE ?
       AND (? IS NULL OR id <> ?)`,
    [partnerId, `${baseId}%`, uploadedStudentId, uploadedStudentId]
  );

  const existingIds = [...studentRows, ...uploadedRows]
    .map((row) => row.partner_student_id)
    .filter((id) => id === baseId || new RegExp(`^${baseId}-\\d{2}$`).test(id));

  return resolveNextIdentifier(baseId, existingIds);
};

module.exports = {
  buildBaseStudentIdentifier,
  generateUniqueStudentIdentifier,
};