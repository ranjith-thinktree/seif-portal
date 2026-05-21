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

// ── Shared dynamic storage factory ───────────────────────────────────────────
const makeDiskStorage = (subDir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(uploadsDir, subDir);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const originalName = file.originalname.replace(/\s+/g, '_');
      cb(null, `${Date.now()}_${originalName}`);
    },
  });

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
  storage: makeDiskStorage('pdf_uploads'),
  fileFilter: pdfFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

/** Single PDF/image upload (field name: 'file') */
const uploadPDF = pdfUpload.single('file');

// ── Certification partner form upload: single support doc ────────────────────
// Allowed: PDF, images, Word (.doc/.docx), CSV, XLSX
const certSupportDocFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.csv', '.xlsx', '.xls'];
  if (!allowed.includes(ext)) {
    return cb(
      new Error(`Support document must be PDF, image, Word, or spreadsheet. Got: ${ext}`),
      false
    );
  }
  cb(null, true);
};

const certSupportUpload = multer({
  storage: makeDiskStorage('cert_support'),
  fileFilter: certSupportDocFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

/** Single support doc for partner certification form (field name: 'supportDoc') */
const uploadCertificationFiles = certSupportUpload.single('supportDoc');

// ── TOT trainer documents: resume + qualification + ID proof ───────────────
const totTrainerDocumentFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

  if (!allowed.includes(ext)) {
    return cb(new Error(`Trainer documents must be PDF, image, or Word files. Got: ${ext}`), false);
  }

  cb(null, true);
};

const totTrainerDocumentsUpload = multer({
  storage: makeDiskStorage('tot_trainer_documents'),
  fileFilter: totTrainerDocumentFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 3 },
});

const uploadTotTrainerDocuments = totTrainerDocumentsUpload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'qualificationCertificate', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
]);

// ── ESSCI upload: zipFile (archives) + studentListDoc (docs) ─────────────────
const essciFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'zipFile') {
    const allowed = ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.tgz', '.tbz2'];
    if (!allowed.includes(ext)) {
      return cb(
        new Error(`ZIP field only accepts archive files (.zip,.tar,.gz,.rar,.7z). Got: ${ext}`),
        false
      );
    }
  } else if (file.fieldname === 'studentListDoc') {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.csv', '.xlsx', '.xls'];
    if (!allowed.includes(ext)) {
      return cb(
        new Error(`Student list must be PDF, image, Word, or spreadsheet. Got: ${ext}`),
        false
      );
    }
  }
  cb(null, true);
};

const essciUpload = multer({
  storage: makeDiskStorage('essci_uploads'),
  fileFilter: essciFileFilter,
});

/** Two-field upload for ESSCI: zipFile (archive) + studentListDoc (document) */
const uploadESSCIFiles = essciUpload.fields([
  { name: 'zipFile', maxCount: 1 },
  { name: 'studentListDoc', maxCount: 1 },
]);

// ── Employment upload: Excel/CSV data file + optional PDF/ZIP attachments ────
const employmentAttachmentFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'file') {
    // Main employment data file
    const allowed = ['.csv', '.xlsx', '.xls', '.xlsm'];
    if (!allowed.includes(ext)) {
      return cb(
        new Error(`Employment data file must be CSV or Excel (.csv,.xlsx,.xls). Got: ${ext}`),
        false
      );
    }
  } else if (file.fieldname === 'attachments') {
    // Supporting documents (offer letters, payslips, ZIP archives)
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.zip'];
    if (!allowed.includes(ext)) {
      return cb(new Error(`Attachments must be PDF, image, or ZIP. Got: ${ext}`), false);
    }
  }
  cb(null, true);
};

const employmentUploadMulter = multer({
  storage: makeDiskStorage('employment_attachments'),
  fileFilter: employmentAttachmentFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 11 }, // 1 data file + up to 10 attachments
});

/** Multi-field upload for employment: file (Excel/CSV) + attachments (PDF/ZIP, up to 10) */
const uploadEmploymentWithAttachments = employmentUploadMulter.fields([
  { name: 'file', maxCount: 1 },
  { name: 'attachments', maxCount: 10 },
]);

// ── Settings template upload: .xlsx only ─────────────────────────────────────
const templateFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.xlsx') {
    return cb(new Error(`Template file must be .xlsx. Got: ${ext}`), false);
  }
  cb(null, true);
};

const templateUpload = multer({
  storage: makeDiskStorage('templates'),
  fileFilter: templateFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

/** Single .xlsx template upload (field name: 'templateFile') */
const uploadTemplateFile = templateUpload.single('templateFile');

module.exports = {
  uploadCSV,
  uploadPDF,
  uploadCertificationFiles,
  uploadTotTrainerDocuments,
  uploadESSCIFiles,
  uploadEmploymentWithAttachments,
  uploadTemplateFile,
  handleUploadError,
};
