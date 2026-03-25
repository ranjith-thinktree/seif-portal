const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Multer Configuration for File Uploads
 * Handles multiple format file uploads (CSV, XLSX, XLS, XLSM) for partner data submissions
 * Updated to support ExcelJS integration - never reject uploads!
 */

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create partner-specific subdirectory
    const partnerId = req.user?.partnerId || 'unknown';
    const partnerDir = path.join(uploadsDir, partnerId);

    if (!fs.existsSync(partnerDir)) {
      fs.mkdirSync(partnerDir, { recursive: true });
    }

    cb(null, partnerDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_originalname
    // Preserve original extension for multi-format support
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, '_');
    const filename = `${timestamp}_${originalName}`;
    cb(null, filename);
  },
});

// File filter - allow multiple Excel formats (CSV, XLSX, XLS, XLSM)
const fileFilter = (req, file, cb) => {
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.xlsm'];

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(
        `Invalid file type. Supported formats: CSV (.csv), Excel (.xlsx, .xls, .xlsm). You uploaded: ${ext}`
      ),
      false
    );
  }

  // Check MIME type - be lenient to accept various Excel formats
  const allowedMimeTypes = [
    // CSV
    'text/csv',
    'application/csv',
    'text/plain',
    // Excel XLSX
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Excel XLS (older format)
    'application/vnd.ms-excel',
    // Excel XLSM (macro-enabled)
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    // Generic Office document
    'application/octet-stream', // Sometimes Excel files come with this MIME type
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    console.warn(
      `Warning: Unexpected MIME type "${file.mimetype}" for file "${file.originalname}". Allowing based on extension.`
    );
    // Don't reject - trust the extension if MIME type is unusual
  }

  cb(null, true);
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1, // Only 1 file per request
  },
});

/**
 * Middleware to handle single file upload (CSV, XLSX, XLS, XLSM)
 * Name kept as uploadCSV for backward compatibility
 */
const uploadCSV = upload.single('file');

/**
 * Error handler middleware for multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the allowed limit for this upload type',
        error: err.message,
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Only one file can be uploaded at a time',
        error: err.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
    });
  }

  next();
};

// ── PDF / document file filter ──────────────────────────────────────────────
const pdfFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`Invalid file type. Allowed: PDF, JPG, PNG. Got: ${ext}`), false);
  }
  cb(null, true);
};

const pdfUpload = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB for certificate PDFs
});

/** Single PDF/image upload (field name: 'file') */
const uploadPDF = pdfUpload.single('file');

// ── Certification multipart: dataFile + validationDoc ────────────────────────
const certStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const partnerId = req.user?.partnerId || req.user?.partner_id || 'unknown';
    const partnerDir = path.join(uploadsDir, partnerId);
    if (!fs.existsSync(partnerDir)) fs.mkdirSync(partnerDir, { recursive: true });
    cb(null, partnerDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  },
});

const certFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'dataFile') {
    const allowed = ['.csv', '.xlsx', '.xls', '.xlsm'];
    if (!allowed.includes(ext)) {
      return cb(new Error(`dataFile must be CSV or Excel. Got: ${ext}`), false);
    }
  } else if (file.fieldname === 'validationDoc') {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (!allowed.includes(ext)) {
      return cb(new Error(`validationDoc must be PDF or image. Got: ${ext}`), false);
    }
  }
  cb(null, true);
};

const certUploadMulter = multer({
  storage: certStorage,
  fileFilter: certFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

/** Two-field upload for certification: dataFile (CSV) + validationDoc (PDF/image) */
const uploadCertificationFiles = certUploadMulter.fields([
  { name: 'dataFile', maxCount: 1 },
  { name: 'validationDoc', maxCount: 1 },
]);

module.exports = {
  uploadCSV,
  uploadPDF,
  uploadCertificationFiles,
  handleUploadError,
};
