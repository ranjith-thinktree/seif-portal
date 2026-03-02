const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Excel Handler Utility
 * Handles multi-format Excel file processing using ExcelJS
 * Supports: XLSX, XLS, XLSM, CSV
 *
 * Senior Developer Notes:
 * - This is the core utility that will replace csv-parser for all uploads
 * - ExcelJS is fully free (MIT license) and supports styling, multiple formats
 * - We never reject uploads - if format is unsupported, we provide helpful error
 */

// Expected CSV columns (17 columns - same as csvParser.js)
// Note: "Student ID" is the partner's student ID (partner_student_id in database)
const EXPECTED_COLUMNS = [
  'Center ID',
  'Batch Number',
  'Batch Start Date',
  'Batch End Date',
  'Student ID', // This is partner_student_id (partner's original ID like STU001)
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

// Expected Employment Upload columns (7 columns)
const EXPECTED_EMPLOYMENT_COLUMNS = [
  'Student ID', // Partner's student ID (partner_student_id for matching)
  'Employment Status',
  'Name of the company or Organization',
  'Location of the company',
  'Date of joining/Date of Inception',
  'Designation',
  'Salary per month/Income',
];

/**
 * Detect file format based on magic bytes (file signature) and extension
 * This prevents issues where Excel files have .csv extension or vice versa
 */
const detectFileFormat = (filePath, mimeType) => {
  const ext = path.extname(filePath).toLowerCase();

  // Try to read file magic bytes to detect actual format
  let actualFormat = null;
  try {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
      const header = buffer.slice(0, 4).toString('hex');

      // Magic bytes for file formats:
      // XLSX/XLSM: 504b0304 (PK zip file)
      // XLS: d0cf11e0 (OLE compound file)
      // CSV: Plain text (no magic bytes)
      if (header.startsWith('504b0304')) {
        actualFormat = 'xlsx'; // XLSX or XLSM
      } else if (header.startsWith('d0cf11e0')) {
        actualFormat = 'xls'; // XLS
      } else {
        // Check if it's plain text (CSV)
        const firstBytes = buffer.slice(0, 100).toString('utf8');
        if (/^[\x20-\x7E\r\n,]+$/.test(firstBytes)) {
          actualFormat = 'csv';
        }
      }
    }
  } catch (error) {
    console.warn('Could not read file magic bytes, falling back to extension:', error.message);
  }

  const formatMap = {
    '.xlsx': 'xlsx',
    '.xlsm': 'xlsx', // Treat XLSM as XLSX (macro-enabled)
    '.xls': 'xls',
    '.csv': 'csv',
  };

  // Prefer actual format from magic bytes, fallback to extension
  const detectedFormat = actualFormat || formatMap[ext] || 'unknown';

  return {
    extension: ext,
    format: detectedFormat,
    isSupported: ['xlsx', 'xls', 'csv'].includes(detectedFormat),
    actualFormat: actualFormat, // The format detected from file content
    extensionFormat: formatMap[ext], // The format from extension
  };
};

/**
 * Parse Excel file (XLSX, XLSM, XLS, CSV) and return rows
 * This is the main entry point that replaces csvParser.parseCSVFile
 * @param {string} filePath - Path to the uploaded file
 * @param {string} originalName - Original filename with extension (for format detection)
 * @param {string} uploadType - Type of upload ('students' or 'employment')
 */
const parseExcelFile = async (filePath, originalName = null, uploadType = 'students') => {
  try {
    const workbook = new ExcelJS.Workbook();
    // Use originalName if provided (for Multer uploads), otherwise use filePath
    const fileToDetect = originalName || filePath;
    const fileInfo = detectFileFormat(filePath); // Use actual file path for magic byte detection

    // Debug logging
    if (fileInfo.actualFormat && fileInfo.extensionFormat !== fileInfo.actualFormat) {
      console.warn(
        `⚠️ File extension mismatch: Extension says ${fileInfo.extensionFormat}, but file is actually ${fileInfo.actualFormat}`
      );
    }
    console.log(`🔍 Detected format: ${fileInfo.format} (Extension: ${fileInfo.extension})`);

    // Load file based on ACTUAL format (from magic bytes)
    if (fileInfo.format === 'csv') {
      await workbook.csv.readFile(filePath);
    } else if (fileInfo.format === 'xlsx' || fileInfo.format === 'xls') {
      await workbook.xlsx.readFile(filePath);
    } else {
      throw new Error(
        `Unsupported file format: ${fileInfo.extension}. Please upload XLSX, XLS, or CSV files.`
      );
    }

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('No worksheet found in the uploaded file.');
    }

    const rows = [];
    let headerRow = null;
    let rowNumber = 0;

    // Process each row
    worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      rowNumber++;

      // First row is header
      if (rowIndex === 1) {
        headerRow = row.values.slice(1); // Remove first empty cell from ExcelJS

        // Validate headers based on upload type
        const headerValidation = validateHeaders(headerRow, uploadType);
        if (!headerValidation.isValid) {
          throw new Error(headerValidation.error);
        }
        return; // Skip header row
      }

      // Build row data object
      const rowData = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // ExcelJS columns are 1-indexed
        const columnName = headerRow[colNumber - 1];
        if (columnName) {
          // Extract cell value handling different cell types
          let cellValue = cell.value;

          // Handle hyperlink cells (common for emails/URLs)
          if (cellValue && typeof cellValue === 'object' && cellValue.text !== undefined) {
            cellValue = cellValue.text; // Extract text from hyperlink
          }

          // Handle date cells
          if (cell.type === ExcelJS.ValueType.Date && cellValue instanceof Date) {
            cellValue = formatExcelDate(cellValue);
          }

          // Handle formula cells
          if (cell.type === ExcelJS.ValueType.Formula && cell.result !== undefined) {
            cellValue = cell.result;
          }

          // Handle rich text
          if (cell.type === ExcelJS.ValueType.RichText) {
            cellValue = cell.text;
          }

          // Convert to string and trim
          rowData[columnName] =
            cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
        }
      });

      rows.push({
        rowNumber,
        data: rowData,
      });
    });

    return {
      rows,
      totalRows: rows.length,
      fileFormat: fileInfo.format,
      worksheetName: worksheet.name,
    };
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Excel file parsing failed: ${error.message}`);
  }
};

/**
 * Validate Excel headers match expected columns
 * @param {Array} headers - Array of header strings from Excel
 * @param {string} uploadType - Type of upload ('students' or 'employment')
 */
const validateHeaders = (headers, uploadType = 'students') => {
  const normalizedHeaders = headers.map((h) => String(h || '').trim());

  // Choose expected columns based on upload type
  const expectedColumns =
    uploadType === 'employment' ? EXPECTED_EMPLOYMENT_COLUMNS : EXPECTED_COLUMNS;

  const normalizedExpected = expectedColumns.map((c) => c.trim());

  // Check if all expected columns are present
  const missingColumns = normalizedExpected.filter((col) => !normalizedHeaders.includes(col));

  if (missingColumns.length > 0) {
    const templateType =
      uploadType === 'employment' ? 'employment template' : 'student data template';
    return {
      isValid: false,
      error: `Missing required columns: ${missingColumns.join(', ')}. Please download the ${templateType} and use it.`,
    };
  }

  // Check for extra columns (warning, not error)
  const extraColumns = normalizedHeaders.filter((col) => col && !normalizedExpected.includes(col));

  if (extraColumns.length > 0) {
    console.warn(`Extra columns found (will be ignored): ${extraColumns.join(', ')}`);
  }

  return { isValid: true };
};

/**
 * Format Excel date to DD-MM-YYYY string
 */
const formatExcelDate = (excelDate) => {
  if (!excelDate || !(excelDate instanceof Date)) {
    return '';
  }

  const day = String(excelDate.getDate()).padStart(2, '0');
  const month = String(excelDate.getMonth() + 1).padStart(2, '0');
  const year = excelDate.getFullYear();

  return `${day}-${month}-${year}`;
};

/**
 * Generate employment data upload template
 * Partners use this to upload employment/placement data for their students
 * @param {string} partnerName - Partner organization name
 * @param {number} sampleRowCount - Number of sample rows to generate
 */
const generateEmploymentTemplate = async (partnerName = 'Partner', sampleRowCount = 5) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'SEIF Portal';
    workbook.lastModifiedBy = 'SEIF Portal';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add worksheet
    const worksheet = workbook.addWorksheet('Employment Upload', {
      properties: { tabColor: { argb: 'FF00B050' } },
      views: [{ state: 'frozen', ySplit: 1 }], // Freeze header row
    });

    // Define columns
    worksheet.columns = [
      { header: 'Student ID', key: 'studentId', width: 20 },
      { header: 'Employment Status', key: 'employmentStatus', width: 20 },
      { header: 'Name of the company or Organization', key: 'companyName', width: 35 },
      { header: 'Location of the company', key: 'companyLocation', width: 30 },
      { header: 'Date of joining/Date of Inception', key: 'dateOfJoining', width: 25 },
      { header: 'Designation', key: 'designation', width: 25 },
      { header: 'Salary per month/Income', key: 'salary', width: 22 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00B050' }, // Green color for employment
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 30;

    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Add sample data rows
    for (let i = 1; i <= sampleRowCount; i++) {
      const today = new Date();
      const joiningDate = new Date(today);
      joiningDate.setMonth(joiningDate.getMonth() - Math.floor(Math.random() * 6)); // Random date in last 6 months

      const companies = [
        'Google India',
        'Microsoft',
        'Amazon',
        'Wipro',
        'TCS',
        'Infosys',
        'Tech Mahindra',
      ];
      const locations = ['Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Delhi NCR'];
      const designations = [
        'Software Engineer',
        'Junior Developer',
        'Technical Support',
        'Data Analyst',
        'Business Analyst',
      ];
      const statuses = ['Employed', 'Self-Employed', 'Entrepreneur'];

      const row = worksheet.addRow({
        studentId: `STU-2024-${String(i).padStart(3, '0')}`,
        employmentStatus: statuses[i % statuses.length],
        companyName: companies[i % companies.length],
        companyLocation: locations[i % locations.length],
        dateOfJoining: formatExcelDate(joiningDate),
        designation: designations[i % designations.length],
        salary: 25000 + i * 5000, // Salary range 25k-50k
      });

      // Add light styling to data rows
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        };
      });
    }

    // Add data validation for Employment Status column (Column B - 2)
    worksheet.getColumn(2).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"Employed,Self-Employed,Entrepreneur,Unemployed,Further Education"'],
          showErrorMessage: true,
          errorTitle: 'Invalid Employment Status',
          error: 'Please select from the dropdown list',
        };

        // Highlight dropdown cells
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFE6F0' }, // Light pink
        };
      }
    });

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instructions', {
      properties: { tabColor: { argb: 'FFFF9900' } },
    });

    instructionsSheet.columns = [{ header: '', key: 'col1', width: 80 }];

    const instructions = [
      `${partnerName} - Employment Data Upload Template`,
      '',
      '📋 IMPORTANT INSTRUCTIONS:',
      '',
      '1. Student ID: Use the SAME Student ID you provided in the student data upload',
      '   - We will match students by (Partner + Student ID)',
      '   - If Student ID not found, that row will be rejected',
      '',
      '2. Employment Status: Select from dropdown',
      '   - Employed: Working in a company/organization',
      '   - Self-Employed: Running own business/freelancing',
      '   - Entrepreneur: Started own company/venture',
      '   - Unemployed: Currently not working',
      '   - Further Education: Pursuing higher studies',
      '',
      '3. Company Name: Full name of company or organization',
      '   - For Self-Employed: Write "Self-Employed"',
      '   - For Entrepreneur: Your company name',
      '',
      '4. Company Location: City, State format',
      '   - Example: Bangalore, Karnataka',
      '',
      '5. Date of joining/Date of Inception:',
      '   - Format: DD-MM-YYYY (e.g., 15-01-2024)',
      '   - For Employed: Date of joining the company',
      '   - For Entrepreneur: Date of starting the business',
      '',
      '6. Designation: Job role or title',
      '   - For Entrepreneur: Write "Founder" or "CEO"',
      '',
      '7. Salary per month/Income:',
      '   - Enter amount in rupees (numbers only)',
      '   - Example: 25000 (for ₹25,000 per month)',
      '',
      '⚠️ CRITICAL REQUIREMENTS:',
      '- Only upload employment data for APPROVED students',
      '- Student ID must exactly match the ID from student data upload',
      '- All students in this file must belong to your partner account',
      '',
      '✅ Supported Formats: .xlsx, .xls, .csv',
      '',
      'For support: contact SEIF Portal Administrator',
    ];

    instructions.forEach((text, index) => {
      const row = instructionsSheet.getRow(index + 1);
      row.getCell('A').value = text;
      row.getCell('A').alignment = { wrapText: true, vertical: 'top' };

      if (text.startsWith('📋') || text.startsWith('⚠️') || text.startsWith('✅')) {
        row.getCell('A').font = { bold: true, size: 12, color: { argb: 'FF00B050' } };
        row.height = 25;
      } else if (text.match(/^\d+\./)) {
        row.getCell('A').font = { bold: true, size: 11 };
      }
    });

    // Generate buffer and return
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    console.error('Employment template generation error:', error);
    throw new Error(`Failed to generate employment template: ${error.message}`);
  }
};

/**
 * Generate Excel template with partner's centers
 * This replaces the CSV template generation
 * @param {Array} partnerCenters - Array of partner's centers
 * @param {string} partnerName - Partner organization name
 * @param {Array} availableCourses - Array of available courses from database
 */
const generateDynamicTemplate = async (
  partnerCenters,
  partnerName = 'Partner',
  availableCourses = []
) => {
  try {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'SEIF Portal';
    workbook.lastModifiedBy = 'SEIF Portal';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add worksheet
    const worksheet = workbook.addWorksheet('Data Upload Template', {
      properties: { tabColor: { argb: 'FF4472C4' } },
      views: [{ state: 'frozen', ySplit: 1 }], // Freeze header row
    });

    // Define columns with styling
    worksheet.columns = [
      { header: 'Center ID', key: 'centerId', width: 20 },
      { header: 'Batch Number', key: 'batchNumber', width: 25 },
      { header: 'Batch Start Date', key: 'batchStartDate', width: 18 },
      { header: 'Batch End Date', key: 'batchEndDate', width: 18 },
      { header: 'Student ID', key: 'studentId', width: 18 },
      { header: 'Name of the Trainee', key: 'studentName', width: 30 },
      { header: 'DOB', key: 'dob', width: 15 },
      { header: 'Father Name', key: 'fatherName', width: 25 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Mobile Number', key: 'mobile', width: 18 },
      { header: 'Email ID', key: 'email', width: 30 },
      { header: 'Qualification', key: 'qualification', width: 18 },
      { header: 'Course Attended', key: 'course', width: 25 },
      { header: 'Student Address', key: 'address', width: 35 },
      { header: 'Student City', key: 'city', width: 18 },
      { header: 'Student State', key: 'state', width: 18 },
      { header: 'Student District', key: 'district', width: 18 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // Get course names from database or use defaults
    const sampleCourses =
      availableCourses && availableCourses.length > 0
        ? availableCourses.map((c) => c.course_name)
        : ['Electrical', 'Solar', 'Industrial Automation', 'TOT'];

    // Start data after header row
    const dataStartRow = 2;

    // Generate 2 sample rows per center
    partnerCenters.forEach((center, centerIndex) => {
      const rowsPerCenter = 2;

      for (let i = 0; i < rowsPerCenter; i++) {
        const studentNum = centerIndex * rowsPerCenter + i + 1;
        const course = sampleCourses[centerIndex % sampleCourses.length];

        // Format dates
        const today = new Date();
        const batchStart = new Date(today);
        batchStart.setMonth(batchStart.getMonth() - 2);
        const batchEnd = new Date(today);
        batchEnd.setMonth(batchEnd.getMonth() + 4);
        // DOB cycles through realistic birth years (1990-2004) regardless of row count

        const row = worksheet.addRow({
          centerId: center.center_id,
          batchNumber: `BATCH-2024-Q4-${course.substring(0, 4).toUpperCase()}`,
          batchStartDate: formatExcelDate(batchStart),
          batchEndDate: formatExcelDate(batchEnd),
          studentId: `STU-2024-${String(studentNum).padStart(3, '0')}`,
          studentName: `Sample Student ${studentNum}`,
          dob: formatExcelDate(new Date(1990 + (studentNum % 15), (studentNum % 12), 15)),
          fatherName: `Father ${studentNum}`,
          gender: i % 2 === 0 ? 'Male' : 'Female',
          mobile: `98765${String(43210 + studentNum).padStart(5, '0')}`,
          email: `student${studentNum}@example.com`,
          qualification: ['10th Pass', '12th Pass', 'Graduate', 'ITI', 'Diploma'][studentNum % 5],
          course: course,
          address: `${studentNum} Sample Address`,
          city: center.city || 'Mumbai',
          state: center.state || 'Maharashtra',
          district: center.city || 'Mumbai',
        });

        // Add light styling to data rows
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
            right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          };
        });
      }
    });

    // Add data validation for Gender column (Column I - 9)
    worksheet.getColumn(9).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        // Skip header
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"Male,Female,Other"'],
          showErrorMessage: true,
          errorTitle: 'Invalid Gender',
          error: 'Please select Male, Female, or Other',
        };
      }
    });

    // Add data validation for Course Attended column (Column M - 13) with strict validation and styling
    if (sampleCourses && sampleCourses.length > 0) {
      const courseList = sampleCourses.join(',');

      worksheet.getColumn(13).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 1) {
          // Apply to all data rows (skip header)
          // Add strict dropdown validation
          cell.dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: [`"${courseList}"`],
            showErrorMessage: true,
            errorTitle: '🔒 Invalid Course',
            error: `You must select a course from the dropdown list. Available courses: ${courseList}`,
            showInputMessage: true,
            promptTitle: '📋 Course Selection Required',
            prompt: `Please select from dropdown: ${courseList}`,
          };

          // Add light orange/yellow background to indicate dropdown field
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF4E6' }, // Light orange/yellow
          };

          // Add note to indicate this is a dropdown field
          cell.note = {
            texts: [
              {
                font: { bold: true, size: 10, color: { argb: 'FFFF6600' } },
                text: '🔒 Dropdown Required\n',
              },
              { font: { size: 9 }, text: `Select from: ${courseList}` },
            ],
          };
        }
      });
    }

    // Add instructions sheet with side-by-side layout
    const instructionsSheet = workbook.addWorksheet('Instructions', {
      properties: { tabColor: { argb: 'FFFF9900' } },
    });

    // Set up 4 columns: A & B for instructions, C & D for centers
    instructionsSheet.columns = [
      { header: '', key: 'col1', width: 40 },
      { header: '', key: 'col2', width: 10 },
      { header: '', key: 'col3', width: 25 },
      { header: '', key: 'col4', width: 35 },
    ];

    // Build dynamic course list from database
    const courseListText = sampleCourses.map((course) => `   • ${course}`).join('\n');

    const instructions = [
      `Welcome ${partnerName}! Please follow these guidelines:`,
      '',
      '1. DO NOT modify the column headers in the template',
      '2. Fill data for all your centers and batches',
      '3. Date format: DD-MM-YYYY (e.g., 15-01-2024)',
      '4. Gender must be: Male, Female, or Other',
      '5. Use your valid Center IDs from "Your Centers" table (see columns C & D)',
      '6. Each student must have a unique Student ID',
      '7. Mobile numbers should be 10 digits',
      `8. Course Attended must be EXACTLY one of these (case-sensitive):\n${courseListText}`,
      '9. Course Attended has DROPDOWN - you MUST select from list (cells are highlighted in light orange)',
      '10. Save the file and upload it on the portal',
      '',
      '🎯 Supported Formats: .xlsx, .xls, .csv',
      '✅ We accept all Excel formats - no rejections!',
      '',
      'For support: contact SEIF Portal Administrator',
    ];

    // Row 1: Instructions header in A-B, Centers header in C-D
    const row1 = instructionsSheet.getRow(1);
    row1.getCell('A').value = 'Instructions';
    row1.getCell('A').font = { bold: true, size: 14, color: { argb: 'FF4472C4' } };
    row1.getCell('C').value = 'Your Centers:';
    row1.getCell('C').font = { bold: true, size: 12, color: { argb: 'FF4472C4' } };
    row1.getCell('C').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };
    row1.getCell('D').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };

    // Row 2: Empty in A-B, Center table headers in C-D
    const row2 = instructionsSheet.getRow(2);
    row2.getCell('C').value = 'Center ID';
    row2.getCell('D').value = 'Center Name';
    row2.getCell('C').font = { bold: true, size: 11 };
    row2.getCell('D').font = { bold: true, size: 11 };
    row2.getCell('C').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    row2.getCell('D').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };
    row2.getCell('C').border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    row2.getCell('D').border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Fill instructions in A-B and centers in C-D simultaneously
    let instructionIndex = 0;
    let centerIndex = 0;
    const maxRows = Math.max(instructions.length, partnerCenters.length + 2); // +2 for headers

    for (let i = 2; i < maxRows + 2; i++) {
      const row = instructionsSheet.getRow(i + 1); // Start from row 3

      // Fill instructions in column A
      if (instructionIndex < instructions.length) {
        const text = instructions[instructionIndex];
        row.getCell('A').value = text;
        row.getCell('A').alignment = { wrapText: true, vertical: 'top' };

        if (text.startsWith('🎯') || text.startsWith('✅')) {
          row.getCell('A').font = { bold: true, size: 12, color: { argb: 'FF008000' } };
        } else if (text.startsWith('8.') || text.startsWith('9.')) {
          row.getCell('A').font = { bold: true, size: 11, color: { argb: 'FFFF6600' } };
        }
        instructionIndex++;
      }

      // Fill centers in columns C-D
      if (centerIndex < partnerCenters.length) {
        const center = partnerCenters[centerIndex];
        row.getCell('C').value = center.center_id;
        row.getCell('D').value = center.center_name;
        row.getCell('C').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('D').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('C').border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        };
        row.getCell('D').border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        };
        centerIndex++;
      }
    }

    return workbook;
  } catch (error) {
    console.error('Template generation error:', error);
    throw new Error(`Failed to generate template: ${error.message}`);
  }
};

/**
 * Convert CSV to Excel format
 * Useful when partner uploads CSV but we want to store as XLSX
 */
const convertCSVToExcel = async (csvFilePath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.csv.readFile(csvFilePath);
    return workbook;
  } catch (error) {
    throw new Error(`CSV to Excel conversion failed: ${error.message}`);
  }
};

/**
 * Validate file before processing
 * @param {string} filePath - Path to the uploaded file
 * @param {string} mimeType - MIME type from upload
 * @param {string} originalName - Original filename with extension (for format detection)
 */
const validateFile = (filePath, mimeType, originalName = null) => {
  // Use originalName if provided (for Multer uploads), otherwise use filePath
  const fileToDetect = originalName || filePath;
  const fileInfo = detectFileFormat(fileToDetect, mimeType);

  if (!fileInfo.isSupported) {
    return {
      isValid: false,
      error: `File format not supported: ${fileInfo.extension}. Please upload .xlsx, .xls, or .csv files.`,
      supportedFormats: ['.xlsx', '.xls', '.xlsm', '.csv'],
    };
  }

  return {
    isValid: true,
    format: fileInfo.format,
    extension: fileInfo.extension,
  };
};

module.exports = {
  parseExcelFile,
  validateHeaders,
  formatExcelDate,
  generateDynamicTemplate,
  generateEmploymentTemplate,
  convertCSVToExcel,
  detectFileFormat,
  validateFile,
  EXPECTED_COLUMNS,
  EXPECTED_EMPLOYMENT_COLUMNS,
};
