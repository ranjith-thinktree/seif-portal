/**
 * Unit Tests: S3 Upload Utility
 * Tests for backend/src/utils/s3.util.js
 *
 * Tests S3 upload functionality including:
 * - Single image upload
 * - Batch image upload
 * - Image deletion
 * - Presigned URL generation
 * - Configuration validation
 * - Folder structure correctness
 */

const s3Util = require('../../src/utils/s3.util');
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockS3Instance = {
    upload: jest.fn(),
    deleteObject: jest.fn(),
    listBuckets: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  return {
    S3: jest.fn(() => mockS3Instance),
    config: {
      update: jest.fn(),
    },
  };
});

// Mock config
jest.mock('../../src/config', () => ({
  aws: {
    accessKeyId: 'TEST_ACCESS_KEY',
    secretAccessKey: 'TEST_SECRET_KEY',
    region: 'us-east-1',
    s3BucketName: 'test-bucket',
  },
}));

describe('S3 Upload Utility', () => {
  let mockS3;

  beforeEach(() => {
    // With resetMocks:true in jest.config.js, the AWS.S3 factory is cleared between tests.
    // Re-create a fresh mock S3 instance and register it as the constructor return value.
    mockS3 = {
      upload: jest.fn(),
      deleteObject: jest.fn(),
      listBuckets: jest.fn(),
      getSignedUrl: jest.fn(),
      getSignedUrlPromise: jest.fn(),
    };
    AWS.S3.mockReturnValue(mockS3);

    // Reset the cached s3Client singleton so s3.util.js calls new AWS.S3() again
    // and picks up our fresh mock instance above.
    s3Util._resetS3Client();
  });

  describe('uploadImageToS3', () => {
    test('should upload image with correct S3 key format', async () => {
      const mockBuffer = Buffer.from('test image data');
      const fileName = 'test-image.jpg';
      const mimeType = 'image/jpeg';
      const requestId = 'req-123';
      const imageType = 'admin-completion';
      const courseId = null;

      // Mock successful S3 upload
      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Location:
            'https://s3.amazonaws.com/test-bucket/refurbishment/req-123/admin-completion/image.jpg',
          Key: 'refurbishment/req-123/admin-completion/image.jpg',
        }),
      });

      const result = await s3Util.uploadImageToS3(
        mockBuffer,
        fileName,
        mimeType,
        requestId,
        imageType,
        courseId
      );

      // Verify S3 upload was called
      expect(mockS3.upload).toHaveBeenCalled();

      // Verify S3 key format
      const uploadParams = mockS3.upload.mock.calls[0][0];
      expect(uploadParams.Key).toMatch(/^refurbishment\/req-123\/admin-completion\//);
      expect(uploadParams.Bucket).toBe('test-bucket');
      expect(uploadParams.ContentType).toBe('image/jpeg');
      expect(uploadParams.ServerSideEncryption).toBe('AES256');
      expect(uploadParams.ACL).toBe('private');

      // Verify metadata
      expect(uploadParams.Metadata).toMatchObject({
        'request-id': requestId,
        'image-type': imageType,
      });

      // Verify result is S3 URL
      expect(result).toContain('s3.amazonaws.com');
    });

    test('should upload partner-before image with course ID in path', async () => {
      const mockBuffer = Buffer.from('test image data');
      const requestId = 'req-456';
      const imageType = 'partner-before';
      const courseId = 'course-789';

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Location:
            'https://s3.amazonaws.com/test-bucket/refurbishment/req-456/partner-before/course-789/image.jpg',
          Key: 'refurbishment/req-456/partner-before/course-789/image.jpg',
        }),
      });

      await s3Util.uploadImageToS3(
        mockBuffer,
        'image.jpg',
        'image/jpeg',
        requestId,
        imageType,
        courseId
      );

      const uploadParams = mockS3.upload.mock.calls[0][0];
      expect(uploadParams.Key).toMatch(/^refurbishment\/req-456\/partner-before\/course-789\//);
    });

    test('should reject invalid MIME types', async () => {
      const mockBuffer = Buffer.from('test data');
      const invalidMimeType = 'application/pdf';

      await expect(
        s3Util.uploadImageToS3(
          mockBuffer,
          'file.pdf',
          invalidMimeType,
          'req-123',
          'admin-completion',
          null
        )
      ).rejects.toThrow(/Invalid.*MIME.*type/i);
    });

    test('should reject invalid image types', async () => {
      const mockBuffer = Buffer.from('test data');

      await expect(
        s3Util.uploadImageToS3(
          mockBuffer,
          'image.jpg',
          'image/jpeg',
          'req-123',
          'invalid-type', // Invalid imageType
          null
        )
      ).rejects.toThrow(/Invalid.*image.*type/i);
    });

    test('should handle S3 upload errors gracefully', async () => {
      const mockBuffer = Buffer.from('test data');

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('S3 upload failed')),
      });

      await expect(
        s3Util.uploadImageToS3(
          mockBuffer,
          'image.jpg',
          'image/jpeg',
          'req-123',
          'admin-completion',
          null
        )
      ).rejects.toThrow('S3 upload failed');
    });
  });

  describe('uploadMultipleImagesToS3', () => {
    test('should upload multiple images in parallel', async () => {
      const files = [
        {
          buffer: Buffer.from('image 1'),
          originalname: 'image1.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
        },
        {
          buffer: Buffer.from('image 2'),
          originalname: 'image2.png',
          mimetype: 'image/png',
          size: 2048,
        },
      ];

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Location: 'https://s3.amazonaws.com/test-bucket/image.jpg',
          Key: 'refurbishment/req-123/admin-completion/image.jpg',
        }),
      });

      const requestId = 'req-123';
      const imageType = 'admin-completion';

      const results = await s3Util.uploadMultipleImagesToS3(files, requestId, imageType, null);

      expect(mockS3.upload).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      results.forEach((url) => {
        expect(url).toContain('s3.amazonaws.com');
      });
    });

    test('should handle partial upload failures', async () => {
      const files = [
        {
          buffer: Buffer.from('image 1'),
          originalname: 'image1.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
        },
        {
          buffer: Buffer.from('image 2'),
          originalname: 'image2.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
        },
      ];

      // First upload succeeds, second fails
      mockS3.upload
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Location: 'https://s3.amazonaws.com/test-bucket/image1.jpg',
          }),
        })
        .mockReturnValueOnce({
          promise: jest.fn().mockRejectedValue(new Error('Upload failed')),
        });

      await expect(
        s3Util.uploadMultipleImagesToS3(files, 'req-123', 'admin-completion', null)
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('deleteImageFromS3', () => {
    test('should delete image by S3 URL', async () => {
      const s3Url =
        'https://test-bucket.s3.amazonaws.com/refurbishment/req-123/admin-completion/image.jpg';

      mockS3.deleteObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const result = await s3Util.deleteImageFromS3(s3Url);

      expect(mockS3.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'refurbishment/req-123/admin-completion/image.jpg',
      });

      expect(result).toBe(true);
    });

    test('should handle delete errors gracefully', async () => {
      const s3Url = 'https://test-bucket.s3.amazonaws.com/image.jpg';

      mockS3.deleteObject.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('Delete failed')),
      });

      const result = await s3Util.deleteImageFromS3(s3Url);

      // Should return false on error (non-critical operation)
      expect(result).toBe(false);
    });
  });

  describe('deleteMultipleImagesFromS3', () => {
    test('should delete multiple images', async () => {
      const s3Urls = [
        'https://test-bucket.s3.amazonaws.com/image1.jpg',
        'https://test-bucket.s3.amazonaws.com/image2.jpg',
      ];

      mockS3.deleteObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({}),
      });

      const results = await s3Util.deleteMultipleImagesFromS3(s3Urls);

      expect(mockS3.deleteObject).toHaveBeenCalledTimes(2);
      expect(results).toBe(2); // deleteMultipleImagesFromS3 returns successCount
    });
  });

  describe('generatePresignedUrl', () => {
    test('should generate presigned URL with default expiration', async () => {
      const s3Key = 'refurbishment/req-123/image.jpg';
      const mockUrl = 'https://presigned-url.com/image.jpg';

      mockS3.getSignedUrlPromise.mockResolvedValue(mockUrl);

      const result = await s3Util.generatePresignedUrl(s3Key);

      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
        Bucket: 'test-bucket',
        Key: s3Key,
        Expires: 3600, // 1 hour default
      });

      expect(result).toBe(mockUrl);
    });

    test('should generate presigned URL with custom expiration', async () => {
      const s3Key = 'refurbishment/req-123/image.jpg';
      const customExpiration = 7200; // 2 hours
      const mockUrl = 'https://presigned-url.com/image.jpg';

      mockS3.getSignedUrlPromise.mockResolvedValue(mockUrl);

      await s3Util.generatePresignedUrl(s3Key, customExpiration);

      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('getObject', {
        Bucket: 'test-bucket',
        Key: s3Key,
        Expires: customExpiration,
      });
    });
  });

  describe('checkS3Configuration', () => {
    test('should validate S3 configuration successfully', async () => {
      mockS3.listBuckets.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Buckets: [{ Name: 'test-bucket' }],
        }),
      });

      const result = await s3Util.checkS3Configuration();

      expect(mockS3.listBuckets).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle invalid configuration', async () => {
      mockS3.listBuckets.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('Access Denied')),
      });

      const result = await s3Util.checkS3Configuration();

      expect(result).toBe(false);
    });
  });

  describe('S3 Key Generation', () => {
    test('should generate unique keys for concurrent uploads', async () => {
      const mockBuffer = Buffer.from('test');
      const baseParams = {
        fileName: 'image.jpg',
        mimeType: 'image/jpeg',
        requestId: 'req-123',
        imageType: 'admin-completion',
        courseId: null,
      };

      mockS3.upload.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Location: 'https://s3.amazonaws.com/test-bucket/image.jpg',
          Key: 'refurbishment/req-123/admin-completion/image.jpg',
        }),
      });

      // Upload same image twice
      await s3Util.uploadImageToS3(mockBuffer, ...Object.values(baseParams));
      await s3Util.uploadImageToS3(mockBuffer, ...Object.values(baseParams));

      // Get the two S3 keys
      const key1 = mockS3.upload.mock.calls[0][0].Key;
      const key2 = mockS3.upload.mock.calls[1][0].Key;

      // Keys should be different (due to timestamp and UUID)
      expect(key1).not.toBe(key2);
    });
  });
});
