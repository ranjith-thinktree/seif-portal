const uploadService = require('../../src/api/v1/services/upload.service');
const db = require('../../src/database/connection');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('../../src/database/connection');
jest.mock('uuid');
jest.mock('../../src/utils/uploadStatus.util', () => ({
  resolveEffectiveUploadStatus: jest.fn(async (_connection, _uploadId, status) => status),
  syncUploadLifecycle: jest.fn(async () => ({})),
}));

describe('Upload Service - Unit Tests', () => {
  let mockConnection;

  beforeEach(() => {
    // Mock database connection
    mockConnection = {
      query: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };

    db.getConnection = jest.fn().mockResolvedValue(mockConnection);
    uuidv4.mockReturnValue('test-uuid-1234');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processUpload - partner_student_id validation', () => {
    it('should use partner_student_id instead of student_id', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'upload-uuid';
      const mockCsvData = [
        {
          center_id: 'C001',
          center_name: 'Test Center',
          student_id: 'S001', // CSV column name (partner's ID)
          student_name: 'John Doe',
          course_name: 'Web Development',
          batch_number: 'B001',
          gender: 'Male',
        },
      ];

      // Mock successful center insertion
      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 1 }]) // center insert
        .mockResolvedValueOnce([[]]) // check existing batch
        .mockResolvedValueOnce([{ insertId: 1 }]) // batch insert
        .mockResolvedValueOnce([{ insertId: 1 }]); // student insert

      await uploadService.processUpload(mockPartnerId, mockUploadId, mockCsvData);

      // Verify student insert used partner_student_id
      const studentInsertCall = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('INSERT INTO uploaded_students')
      );

      expect(studentInsertCall).toBeDefined();
      expect(studentInsertCall[0]).toContain('partner_student_id');
      expect(studentInsertCall[1]).toContain('S001'); // Original student_id mapped to partner_student_id
    });

    it('should detect duplicate partner_student_id within same partner', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'upload-uuid';
      const mockCsvData = [
        {
          center_id: 'C001',
          center_name: 'Test Center',
          student_id: 'S001',
          student_name: 'John Doe',
          course_name: 'Web Development',
          batch_number: 'B001',
          gender: 'Male',
        },
        {
          center_id: 'C001',
          center_name: 'Test Center',
          student_id: 'S001', // Duplicate
          student_name: 'Jane Doe',
          course_name: 'Web Development',
          batch_number: 'B001',
          gender: 'Female',
        },
      ];

      // Mock duplicate key error (MySQL ER_DUP_ENTRY)
      const duplicateError = new Error('Duplicate entry');
      duplicateError.code = 'ER_DUP_ENTRY';
      duplicateError.sqlMessage = "Duplicate entry 'partner-uuid-S001'";

      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 1 }]) // center
        .mockResolvedValueOnce([[]]) // batch check
        .mockResolvedValueOnce([{ insertId: 1 }]) // batch insert
        .mockResolvedValueOnce([{ insertId: 1 }]) // first student OK
        .mockRejectedValueOnce(duplicateError); // second student fails

      await expect(
        uploadService.processUpload(mockPartnerId, mockUploadId, mockCsvData)
      ).rejects.toThrow();

      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });

  describe('getCenterApprovalStatus', () => {
    it('should reject if not all batches are approved', async () => {
      const mockCenterId = 'center-uuid';

      // Mock: 2 batches, 1 approved, 1 pending
      mockConnection.query.mockResolvedValueOnce([
        [
          { id: 'batch-1', review_status: 'approved' },
          { id: 'batch-2', review_status: 'pending' },
        ],
      ]);

      const result = await uploadService.getCenterApprovalStatus(mockCenterId);

      expect(result.canApprove).toBe(false);
      expect(result.reason).toContain('not all batches are approved');
    });

    it('should approve if all batches are approved', async () => {
      const mockCenterId = 'center-uuid';

      // Mock: All batches approved
      mockConnection.query.mockResolvedValueOnce([
        [
          { id: 'batch-1', review_status: 'approved' },
          { id: 'batch-2', review_status: 'approved' },
        ],
      ]);

      const result = await uploadService.getCenterApprovalStatus(mockCenterId);

      expect(result.canApprove).toBe(true);
    });
  });

  describe('validation - field requirements', () => {
    it('should validate required fields exist', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'upload-uuid';
      const invalidData = [
        {
          center_id: 'C001',
          center_name: 'Test Center',
          // Missing student_id (partner_student_id)
          student_name: 'John Doe',
          course_name: 'Web Development',
        },
      ];

      await expect(
        uploadService.processUpload(mockPartnerId, mockUploadId, invalidData)
      ).rejects.toThrow();
    });

    it('should validate gender enum values', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'upload-uuid';
      const invalidData = [
        {
          center_id: 'C001',
          center_name: 'Test Center',
          student_id: 'S001',
          student_name: 'John Doe',
          course_name: 'Web Development',
          batch_number: 'B001',
          gender: 'Invalid', // Should be Male/Female/Other
        },
      ];

      const enumError = new Error('Invalid gender');
      enumError.code = 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD';

      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 1 }]) // center
        .mockResolvedValueOnce([[]]) // batch
        .mockResolvedValueOnce([{ insertId: 1 }]) // batch insert
        .mockRejectedValueOnce(enumError); // student fails

      await expect(
        uploadService.processUpload(mockPartnerId, mockUploadId, invalidData)
      ).rejects.toThrow();
    });
  });

  describe('soft delete - version system', () => {
    it('should mark V1 with deleted_at when V2 is created', async () => {
      const mockParentUploadId = 'parent-uuid';
      const mockPartnerId = 'partner-uuid';

      // Mock: Create V2 upload
      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 1, id: 'new-upload-uuid' }]) // insert V2
        .mockResolvedValueOnce([[]]); // check for updates

      await uploadService.createResubmission(mockParentUploadId, mockPartnerId);

      // Verify V1 marked as deleted
      const updateCall = mockConnection.query.mock.calls.find(
        (call) => call[0].includes('UPDATE data_uploads') && call[0].includes('deleted_at')
      );

      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('deleted_at = NOW()');
      expect(updateCall[1]).toContain(mockParentUploadId);
    });

    it('should filter out soft-deleted uploads in partner queries', async () => {
      const mockPartnerId = 'partner-uuid';

      mockConnection.query.mockResolvedValueOnce([
        [
          { id: 'upload-1', version: 2, deleted_at: null }, // Active V2
          // V1 filtered by WHERE deleted_at IS NULL
        ],
      ]);

      await uploadService.getPartnerUploads(mockPartnerId);

      const selectCall = mockConnection.query.mock.calls[0];
      expect(selectCall[0]).toContain('deleted_at IS NULL');
    });
  });

  describe('composite unique key - (partner_id, partner_student_id)', () => {
    it('should allow same partner_student_id for different partners', async () => {
      const mockCsvData = [
        {
          center_id: 'C001',
          center_name: 'Test Center',
          student_id: 'S001', // Same ID
          student_name: 'John Doe',
          course_name: 'Web Development',
          batch_number: 'B001',
          gender: 'Male',
        },
      ];

      // Upload for Partner A
      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      await uploadService.processUpload('partner-A-uuid', 'upload-A', mockCsvData);

      jest.clearAllMocks();

      // Upload for Partner B (same student_id - should work)
      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      await expect(
        uploadService.processUpload('partner-B-uuid', 'upload-B', mockCsvData)
      ).resolves.not.toThrow();
    });
  });
});
