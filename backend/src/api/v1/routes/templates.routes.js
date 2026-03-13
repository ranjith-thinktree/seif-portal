const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const {
  downloadTemplate,
  replaceTemplate,
  listTemplates,
} = require('../controllers/template.controller');
const { authenticate } = require('../../../middleware/auth.middleware');
const { checkRole } = require('../../../middleware/role.middleware');

// Multer: temp upload for admin replace
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xls|xlsx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV/Excel files are allowed'));
    }
  },
});

/**
 * Template Routes
 *
 * Public:  GET  /api/v1/templates/:name          — download a template
 * Admin:   GET  /api/v1/admin/templates           — list templates
 * Admin:   POST /api/v1/admin/templates/:name     — replace a template file
 */

// Public download (PARTNER + all logged-in users)
router.get('/:name', authenticate, downloadTemplate);

// Admin management
router.get('/', authenticate, checkRole(['ADMIN', 'SUPER_ADMIN']), listTemplates);
router.post(
  '/:name',
  authenticate,
  checkRole(['ADMIN', 'SUPER_ADMIN']),
  upload.single('template'),
  replaceTemplate
);

module.exports = router;
