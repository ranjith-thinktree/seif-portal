const fs = require('fs');
const csv = require('csv-parser');
const stringSimilarity = require('string-similarity');

/**
 * CSV Parser and Validator Utility
 * Parses and validates uploaded CSV files according to SEIF specifications
 */

// Expected CSV columns (17 columns - simplified for partner upload)
const EXPECTED_COLUMNS = [
  'Center ID',
  'Batch Number',
  'Batch Start Date',
  'Batch End Date',
  'Student ID',
  'Name of the Trainee',
  'DOB',
  'Father Name',
  'Gender',
  'Mobile Number',
  'Email ID',
  'Qualification',
  'Course Attended',
  'Student Address',
  'Student City',
  'Student State',
  'Student District',
];

// Allowed enum values
const ALLOWED_VALUES = {
  gender: ['Male', 'Female', 'Other'],
};

/**
 * Parse CSV file and return rows as array
 */
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    const errors = [];
    let rowNumber = 1; // Start from 1 (header row)

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        // Validate headers match expected columns
        const headerValidation = validateHeaders(headers);
        if (!headerValidation.isValid) {
          reject(new Error(headerValidation.error));
        }
      })
      .on('data', (row) => {
        rowNumber++;
        rows.push({
          rowNumber,
          data: row,
        });
      })
      .on('end', () => {
        resolve({ rows, totalRows: rows.length });
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      });
  });
};

/**
 * Validate CSV headers
 */
const validateHeaders = (headers) => {
  const normalizedHeaders = headers.map((h) => h.trim());
  const normalizedExpected = EXPECTED_COLUMNS.map((c) => c.trim());

  // Check if all expected columns are present
  const missingColumns = normalizedExpected.filter((col) => !normalizedHeaders.includes(col));

  if (missingColumns.length > 0) {
    return {
      isValid: false,
      error: `Missing required columns: ${missingColumns.join(', ')}`,
    };
  }

  // Check for extra columns
  const extraColumns = normalizedHeaders.filter((col) => !normalizedExpected.includes(col));

  if (extraColumns.length > 0) {
    return {
      isValid: false,
      error: `Unexpected columns found: ${extraColumns.join(', ')}. Please use the standard template.`,
    };
  }

  return { isValid: true };
};

/**
 * Validate individual row data
 */
const validateRow = (row, rowNumber, availableCourses = []) => {
  const errors = [];
  const data = row.data;

  // Center ID validation (required)
  if (!data['Center ID']?.trim()) {
    errors.push(`Row ${rowNumber}: Center ID is required`);
  }

  // Batch validations
  if (!data['Batch Number']?.trim()) {
    errors.push(`Row ${rowNumber}: Batch Number is required`);
  }

  if (!data['Batch Start Date']?.trim()) {
    errors.push(`Row ${rowNumber}: Batch Start Date is required`);
  } else if (!isValidDate(data['Batch Start Date'])) {
    errors.push(`Row ${rowNumber}: Batch Start Date must be in DD-MM-YYYY format`);
  }

  if (data['Batch End Date']?.trim() && !isValidDate(data['Batch End Date'])) {
    errors.push(`Row ${rowNumber}: Batch End Date must be in DD-MM-YYYY format`);
  }

  // Student validations (required fields)
  if (!data['Student ID']?.trim()) {
    errors.push(`Row ${rowNumber}: Student ID is required`);
  }

  if (!data['Name of the Trainee']?.trim()) {
    errors.push(`Row ${rowNumber}: Name of the Trainee is required`);
  }

  if (!data['Gender']?.trim()) {
    errors.push(`Row ${rowNumber}: Gender is required`);
  } else if (!ALLOWED_VALUES.gender.includes(data['Gender'].trim())) {
    errors.push(`Row ${rowNumber}: Gender must be one of: ${ALLOWED_VALUES.gender.join(', ')}`);
  }

  // DOB validation (lenient - warn on age issues)
  if (data['DOB']?.trim()) {
    if (!isValidDate(data['DOB'])) {
      errors.push(`Row ${rowNumber}: DOB must be in DD-MM-YYYY format`);
    } else {
      const age = calculateAge(data['DOB']);
      if (age < 16 || age > 60) {
        console.warn(
          `Row ${rowNumber}: Student age (${age}) is outside typical range (16-60 years)`
        );
      }
    }
  }

  // Mobile Number validation (lenient - only warn if too short)
  if (data['Mobile Number']?.trim()) {
    const mobile = data['Mobile Number'].replace(/\D/g, '');
    if (mobile.length > 0 && mobile.length < 10) {
      console.warn(
        `Row ${rowNumber}: Mobile Number is shorter than 10 digits (found ${mobile.length})`
      );
    }
  }

  // Email ID validation (lenient - warn on invalid format)
  if (data['Email ID']?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data['Email ID'].trim())) {
      console.warn(`Row ${rowNumber}: Email ID format may be invalid: ${data['Email ID'].trim()}`);
    }
  }

  // Course Attended validation with flexible matching
  if (!data['Course Attended']?.trim()) {
    errors.push(`Row ${rowNumber}: Course Attended is required`);
  } else {
    const courseValidation = validateCourseName(data['Course Attended'].trim(), availableCourses);
    if (!courseValidation.isValid) {
      errors.push(`Row ${rowNumber}: ${courseValidation.error}`);
    } else {
      // Store the matched course name and duration for database insertion
      row.matchedCourseName = courseValidation.matchedCourse;
      row.matchedCourseDuration = courseValidation.courseDuration;
    }
  }

  // Optional fields - Father Name, Qualification, Student State, Student District
  // No validation needed, just warnings for best practices
  if (!data['Father Name']?.trim()) {
    console.warn(`Row ${rowNumber}: Father Name is recommended but not required`);
  }

  if (!data['Qualification']?.trim()) {
    console.warn(`Row ${rowNumber}: Qualification is recommended but not required`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    row: row,
  };
};

/**
 * Validate course name with flexible matching
 * Accepts: lowercase, uppercase, spacing variations, 1-2 character typos
 */
const validateCourseName = (courseName, availableCourses) => {
  if (!availableCourses || availableCourses.length === 0) {
    return {
      isValid: false,
      error: 'No courses available in the system. Please contact administrator.',
    };
  }

  // Normalize input
  const normalizedInput = courseName.trim().toLowerCase().replace(/\s+/g, '');

  // Try exact match first (case-insensitive, ignoring spaces)
  const exactMatch = availableCourses.find(
    (course) => course.course_name.toLowerCase().replace(/\s+/g, '') === normalizedInput
  );

  if (exactMatch) {
    return {
      isValid: true,
      matchedCourse: exactMatch.course_name,
      courseId: exactMatch.id,
      courseDuration: exactMatch.duration_months,
    };
  }

  // Try fuzzy matching for typos
  const courseNames = availableCourses.map((c) => c.course_name);
  const matches = stringSimilarity.findBestMatch(courseName, courseNames);

  // Accept if similarity is >= 0.7 (70% match)
  if (matches.bestMatch.rating >= 0.7) {
    const matchedCourse = availableCourses.find((c) => c.course_name === matches.bestMatch.target);
    return {
      isValid: true,
      matchedCourse: matchedCourse.course_name,
      courseId: matchedCourse.id,
      courseDuration: matchedCourse.duration_months,
      fuzzyMatch: true,
      originalInput: courseName,
    };
  }

  // No match found
  return {
    isValid: false,
    error: `Course Name "${courseName}" not found. Available courses: ${courseNames.join(', ')}`,
  };
};

/**
 * Validate date format (DD-MM-YYYY)
 */
const isValidDate = (dateString) => {
  if (!dateString) return false;

  const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
  if (!dateRegex.test(dateString)) return false;

  const [day, month, year] = dateString.split('-').map(Number);

  // Check valid ranges
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  // Check valid day for month
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

/**
 * Calculate age from date of birth (DD-MM-YYYY)
 */
const calculateAge = (dateOfBirth) => {
  const [day, month, year] = dateOfBirth.split('-').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

/**
 * Convert DD-MM-YYYY to MySQL DATE format (YYYY-MM-DD)
 */
const convertDateToMySQL = (dateString) => {
  if (!dateString || !dateString.trim()) return null;

  const [day, month, year] = dateString.split('-');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Group rows by Center ID and Batch Number
 */
const groupRowsByCenter = (rows) => {
  const centerMap = new Map();

  rows.forEach((row) => {
    const centerId = row.data['Center ID'].trim();
    const batchNumber = row.data['Batch Number'].trim();

    if (!centerMap.has(centerId)) {
      centerMap.set(centerId, {
        centerData: extractCenterData(row.data),
        batches: new Map(),
      });
    }

    const center = centerMap.get(centerId);

    if (!center.batches.has(batchNumber)) {
      center.batches.set(batchNumber, {
        batchData: extractBatchData(row.data),
        students: [],
      });
    }

    const batch = center.batches.get(batchNumber);
    batch.students.push(
      extractStudentData(row.data, row.matchedCourseName, row.matchedCourseDuration)
    );
  });

  return centerMap;
};

/**
 * Extract center data from row (simplified - only Center ID)
 */
const extractCenterData = (data) => {
  return {
    csv_center_id: data['Center ID']?.trim() || null,
  };
};

/**
 * Extract batch data from row (simplified - dates only, counts will be auto-calculated)
 */
const extractBatchData = (data) => {
  return {
    batch_number: data['Batch Number']?.trim() || null,
    batch_start_date: convertDateToMySQL(data['Batch Start Date']),
    batch_complete_date: convertDateToMySQL(data['Batch End Date']),
  };
};

/**
 * Extract student data from row (with new fields)
 */
const extractStudentData = (data, matchedCourseName, matchedCourseDuration) => {
  return {
    student_id: data['Student ID']?.trim() || null,
    student_name: data['Name of the Trainee']?.trim() || null,
    father_name: data['Father Name']?.trim() || null,
    date_of_birth: convertDateToMySQL(data['DOB']),
    gender: data['Gender']?.trim() || null,
    mobile_number: data['Mobile Number']?.replace(/\D/g, '') || null,
    email: data['Email ID']?.trim() || null,
    qualification: data['Qualification']?.trim() || null,
    address: data['Student Address']?.trim() || null,
    city: data['Student City']?.trim() || null,
    state: data['Student State']?.trim() || null,
    district: data['Student District']?.trim() || null,
    enrollment_date: null, // Will be set to batch start date during insert
    course_name: matchedCourseName || data['Course Attended']?.trim() || null,
    course_duration_months: matchedCourseDuration || null,
    training_status: 'enrolled', // Default value
  };
};

module.exports = {
  parseCSVFile,
  validateHeaders,
  validateRow,
  validateCourseName,
  groupRowsByCenter,
  convertDateToMySQL,
  EXPECTED_COLUMNS,
  ALLOWED_VALUES,
};
