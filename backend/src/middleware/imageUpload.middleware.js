const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * Multer Configuration for Package Image Uploads
 * Stores images in frontend/public/uploads/packages/ for S3 deployment
 */

// Path to frontend public directory
const frontendPublicDir = path.join(__dirname, '../../../frontend/public/uploads/packages');

// Ensure directory exists
if (!fs.existsSync(frontendPublicDir)) {
  fs.mkdirSync(frontendPublicDir, { recursive: true });
  console.log(`✅ Created directory: ${frontendPublicDir}`);
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, frontendPublicDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: package-{uuid}-{timestamp}.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const packageId = req.params.packageId || req.body.packageId || uuidv4();
    const timestamp = Date.now();
    const filename = `package-${packageId}-${timestamp}${ext}`;
    cb(null, filename);
  },
});

// File filter - allow images only
const imageFilter = (req, file, cb) => {
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new Error(
        `Invalid file type. Only images are allowed: JPG, JPEG, PNG, GIF, WEBP. You uploaded: ${ext}`
      ),
      false
    );
  }

  // Check MIME type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error(`Invalid MIME type. Expected image type, got: ${file.mimetype}`), false);
  }

  cb(null, true);
};

// Multer upload configuration for package images
const imageUpload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per image
    files: 10, // Max 10 images per package
  },
});

/**
 * Middleware to handle multiple image uploads
 * Field name: 'images'
 * Max: 10 images
 */
const uploadPackageImages = imageUpload.array('images', 10);

/**
 * Error handler middleware for image upload errors
 */
const handleImageUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the limit of 5MB per image',
        error: err.message,
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 images allowed per package',
        error: err.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Image upload error',
      error: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Image upload failed',
    });
  }

  next();
};

/**
 * Helper function to delete an image file
 * @param {string} imagePath - Relative path like "uploads/packages/image.jpg"
 */
const deleteImage = (imagePath) => {
  try {
    // Convert relative path to absolute
    const absolutePath = path.join(__dirname, '../../../frontend/public', imagePath);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`✅ Deleted image: ${imagePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error deleting image ${imagePath}:`, error);
    return false;
  }
};

/**
 * Multer Configuration for Completion Image Uploads (Memory Storage for S3)
 * Stores images in memory buffer for direct S3 upload
 */
const completionImageStorage = multer.memoryStorage();

const completionImageUpload = multer({
  storage: completionImageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per image
    files: 10, // Max 10 images
  },
});

/**
 * Middleware to handle multiple completion image uploads
 * Field name: 'images'
 * Max: 10 images
 * Stores in memory for S3 upload
 */
const uploadCompletionImages = completionImageUpload.array('images', 10);

module.exports = {
  uploadPackageImages,
  uploadCompletionImages,
  handleImageUploadError,
  deleteImage,
};
