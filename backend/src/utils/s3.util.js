const AWS = require('aws-sdk');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * S3 Utility for Refurbishment Image Uploads
 * Handles uploading images to AWS S3 with organized folder structure
 *
 * Folder Structure:
 * s3://bucket/refurbishment/{requestId}/partner-before/{courseId}/{timestamp}_image.jpg
 * s3://bucket/refurbishment/{requestId}/admin-completion/{timestamp}_image.jpg
 */

// Initialize S3 client
let s3Client = null;

/**
 * Initialize S3 client with AWS credentials
 * @returns {AWS.S3} S3 client instance
 */
const initializeS3Client = () => {
  if (s3Client) {
    return s3Client;
  }

  // Check if AWS credentials are configured
  if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !config.aws.s3BucketName) {
    console.warn('⚠️ AWS S3 credentials not configured. Image uploads will fail.');
    console.warn(
      'Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME in .env file'
    );
    return null;
  }

  s3Client = new AWS.S3({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region,
  });

  console.log('✅ S3 Client initialized successfully');
  return s3Client;
};

/**
 * Upload image to S3 with organized folder structure
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type (image/jpeg, image/png)
 * @param {string} requestId - Refurbishment request ID
 * @param {string} imageType - Type of image: 'partner-before' or 'admin-completion'
 * @param {string} courseId - Course ID (required for partner-before images, optional for admin-completion)
 * @returns {Promise<string>} S3 URL of uploaded image
 */
const uploadImageToS3 = async (
  fileBuffer,
  fileName,
  mimeType,
  requestId,
  imageType,
  courseId = null
) => {
  try {
    const s3 = initializeS3Client();

    if (!s3) {
      throw new Error('S3 client not initialized. Please configure AWS credentials in .env file');
    }

    // Validate image type
    if (!['partner-before', 'admin-completion'].includes(imageType)) {
      throw new Error('Invalid image type. Must be "partner-before" or "admin-completion"');
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid MIME type: ${mimeType}. Allowed: ${allowedMimeTypes.join(', ')}`);
    }

    // Generate unique file name with timestamp
    const timestamp = Date.now();
    const fileExtension = path.extname(fileName) || '.jpg';
    const sanitizedFileName = `${timestamp}_${uuidv4()}${fileExtension}`;

    // Build S3 key (folder path)
    let s3Key;
    if (imageType === 'partner-before') {
      if (!courseId) {
        throw new Error('courseId is required for partner-before images');
      }
      s3Key = `refurbishment/${requestId}/partner-before/${courseId}/${sanitizedFileName}`;
    } else {
      // admin-completion images don't need courseId (uploaded together)
      s3Key = `refurbishment/${requestId}/admin-completion/${sanitizedFileName}`;
    }

    // Upload to S3
    const uploadParams = {
      Bucket: config.aws.s3BucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'private', // Private by default, use presigned URLs for access
      ServerSideEncryption: 'AES256', // Encrypt at rest
      Metadata: {
        'request-id': requestId,
        'image-type': imageType,
        'course-id': courseId || 'N/A',
        'uploaded-at': new Date().toISOString(),
      },
    };

    console.log(`📤 Uploading image to S3: ${s3Key}`);
    const result = await s3.upload(uploadParams).promise();

    console.log(`✅ Image uploaded successfully: ${result.Location}`);
    return result.Location; // Returns full S3 URL
  } catch (error) {
    console.error('❌ S3 upload failed:', error);
    throw new Error(`Failed to upload image to S3: ${error.message}`);
  }
};

/**
 * Upload multiple images to S3 (batch upload)
 * @param {Array<{buffer: Buffer, fileName: string, mimeType: string}>} files - Array of file objects
 * @param {string} requestId - Refurbishment request ID
 * @param {string} imageType - Type of image: 'partner-before' or 'admin-completion'
 * @param {string} courseId - Course ID (for partner-before images)
 * @returns {Promise<Array<string>>} Array of S3 URLs
 */
const uploadMultipleImagesToS3 = async (files, requestId, imageType, courseId = null) => {
  try {
    if (!files || files.length === 0) {
      return [];
    }

    console.log(`📤 Uploading ${files.length} images to S3...`);

    // Upload all images in parallel
    // Supports both Multer file format ({originalname, mimetype, buffer}) and explicit format ({fileName, mimeType, buffer})
    const uploadPromises = files.map((file) =>
      uploadImageToS3(
        file.buffer,
        file.fileName || file.originalname,
        file.mimeType || file.mimetype,
        requestId,
        imageType,
        courseId
      )
    );

    const uploadedUrls = await Promise.all(uploadPromises);

    console.log(`✅ Successfully uploaded ${uploadedUrls.length} images to S3`);
    return uploadedUrls;
  } catch (error) {
    console.error('❌ Batch upload failed:', error);
    throw new Error(`Failed to upload multiple images: ${error.message}`);
  }
};

/**
 * Delete image from S3
 * @param {string} s3Url - Full S3 URL or S3 key
 * @returns {Promise<boolean>} True if deleted successfully
 */
const deleteImageFromS3 = async (s3Url) => {
  try {
    const s3 = initializeS3Client();

    if (!s3) {
      throw new Error('S3 client not initialized. Please configure AWS credentials in .env file');
    }

    // Extract S3 key from URL
    let s3Key;
    if (s3Url.startsWith('http')) {
      // Parse S3 URL to extract key
      const url = new URL(s3Url);
      s3Key = url.pathname.substring(1); // Remove leading '/'
    } else {
      // Already a key
      s3Key = s3Url;
    }

    const deleteParams = {
      Bucket: config.aws.s3BucketName,
      Key: s3Key,
    };

    console.log(`🗑️ Deleting image from S3: ${s3Key}`);
    await s3.deleteObject(deleteParams).promise();

    console.log(`✅ Image deleted successfully: ${s3Key}`);
    return true;
  } catch (error) {
    console.error('❌ S3 delete failed:', error);
    // Don't throw error - deletion is not critical
    return false;
  }
};

/**
 * Delete multiple images from S3 (batch delete)
 * @param {Array<string>} s3Urls - Array of S3 URLs or keys
 * @returns {Promise<number>} Number of images deleted successfully
 */
const deleteMultipleImagesFromS3 = async (s3Urls) => {
  try {
    if (!s3Urls || s3Urls.length === 0) {
      return 0;
    }

    console.log(`🗑️ Deleting ${s3Urls.length} images from S3...`);

    // Delete all images in parallel
    const deletePromises = s3Urls.map((url) => deleteImageFromS3(url));
    const results = await Promise.all(deletePromises);

    // Count successful deletions
    const successCount = results.filter(Boolean).length;

    console.log(`✅ Deleted ${successCount}/${s3Urls.length} images from S3`);
    return successCount;
  } catch (error) {
    console.error('❌ Batch delete failed:', error);
    return 0;
  }
};

/**
 * Generate presigned URL for private S3 object (for temporary access)
 * @param {string} s3Key - S3 key (path)
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
const generatePresignedUrl = async (s3Key, expiresIn = 3600) => {
  try {
    const s3 = initializeS3Client();

    if (!s3) {
      throw new Error('S3 client not initialized. Please configure AWS credentials in .env file');
    }

    const params = {
      Bucket: config.aws.s3BucketName,
      Key: s3Key,
      Expires: expiresIn,
    };

    const presignedUrl = await s3.getSignedUrlPromise('getObject', params);
    return presignedUrl;
  } catch (error) {
    console.error('❌ Failed to generate presigned URL:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Generate presigned URL for direct browser PUT upload to S3
 * @param {string} key - S3 key (full path including folder structure)
 * @param {string} contentType - MIME type of the file being uploaded
 * @param {number} expiresIn - URL expiration time in seconds (default: 5 minutes)
 * @returns {Promise<{ uploadUrl: string, fileUrl: string }>}
 */
const generatePutPresignedUrl = async (key, contentType, expiresIn = 300) => {
  try {
    const s3 = initializeS3Client();

    if (!s3) {
      throw new Error('S3 client not initialized. Please configure AWS credentials in .env file');
    }

    const params = {
      Bucket: config.aws.s3BucketName,
      Key: key,
      Expires: expiresIn,
      ContentType: contentType,
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    const fileUrl = `https://${config.aws.s3BucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl };
  } catch (error) {
    console.error('❌ Failed to generate PUT presigned URL:', error);
    throw new Error(`Failed to generate upload URL: ${error.message}`);
  }
};

/**
 * Upload a generic file buffer to S3 (for data upload backups, etc.)
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 key (path including filename)
 * @param {string} contentType - MIME type
 * @returns {Promise<string|null>} S3 URL, or null if S3 is not configured
 */
const uploadFileToS3 = async (buffer, key, contentType) => {
  try {
    const s3 = initializeS3Client();
    if (!s3) return null; // S3 not configured — caller uses local path as fallback

    const params = {
      Bucket: config.aws.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    };

    console.log(`📤 Uploading file to S3: ${key}`);
    const result = await s3.upload(params).promise();
    console.log(`✅ File uploaded to S3: ${result.Location}`);
    return result.Location; // Full S3 URL
  } catch (error) {
    console.error('❌ S3 file upload failed:', error.message);
    return null; // Non-critical — caller falls back to local path
  }
};

/**
 * Check if S3 is configured (synchronous — no network call)
 * @returns {boolean}
 */
const isS3Configured = () => {
  return !!(config.aws.accessKeyId && config.aws.secretAccessKey && config.aws.s3BucketName);
};

/**
 * Check if S3 is configured and accessible
 * @returns {Promise<boolean>} True if S3 is configured and accessible
 */
const checkS3Configuration = async () => {
  try {
    const s3 = initializeS3Client();

    if (!s3) {
      return false;
    }

    // Try to list buckets to verify credentials
    await s3.listBuckets().promise();
    console.log('✅ S3 configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ S3 configuration check failed:', error.message);
    return false;
  }
};

module.exports = {
  uploadImageToS3,
  uploadMultipleImagesToS3,
  uploadFileToS3,
  deleteImageFromS3,
  deleteMultipleImagesFromS3,
  generatePresignedUrl,
  generatePutPresignedUrl,
  isS3Configured,
  checkS3Configuration,
  // Test helper: resets the cached S3 client so it reinitializes on next call
  _resetS3Client: () => {
    s3Client = null;
  },
};
