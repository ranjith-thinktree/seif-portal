const partnerService = require('../../src/api/v1/services/partner.service');
const db = require('../../src/database/connection');
const { v4: uuidv4 } = require('uuid');

jest.mock('../../src/database/connection');

describe('Partner Service - Unit Tests', () => {
  let mockConnection;

  beforeEach(() => {
    mockConnection = {
      query: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };

    db.getConnection = jest.fn().mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('soft delete - resubmission flow', () => {
    it('should mark V1 with deleted_at = NOW() when resubmitting', async () => {
      const mockUploadId = uuidv4();
      const mockPartnerId = uuidv4();

      // Mock: Get V1 upload details
      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockUploadId, version: 1, partner_id: mockPartnerId }]]) // get upload
        .mockResolvedValueOnce([{ insertId: 1, id: uuidv4() }]) // create V2
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // update V1

      await partnerService.resubmitUpload(mockUploadId, mockPartnerId);

      // Verify V1 updated with deleted_at
      const updateCall = mockConnection.query.mock.calls.find(
        (call) => call[0].includes('UPDATE data_uploads') && call[0].includes('deleted_at')
      );

      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('deleted_at = NOW()');
      expect(updateCall[1]).toContain(mockUploadId);
    });

    it('should create V2 with parent_upload_id pointing to V1', async () => {
      const mockUploadId = uuidv4();
      const mockPartnerId = uuidv4();

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockUploadId, version: 1, partner_id: mockPartnerId }]])
        .mockResolvedValueOnce([{ insertId: 1, id: 'upload-v2-uuid' }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await partnerService.resubmitUpload(mockUploadId, mockPartnerId);

      // Verify V2 insert has parent_upload_id and version=2
      const insertCall = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('INSERT INTO data_uploads')
      );

      expect(insertCall).toBeDefined();
      expect(insertCall[0]).toContain('parent_upload_id');
      expect(insertCall[0]).toContain('version');
      expect(insertCall[1]).toContain(mockUploadId); // parent
      expect(insertCall[1]).toContain(2); // version 2
    });

    it('should increment version for multiple resubmissions', async () => {
      const mockUploadV2 = 'upload-v2-uuid';
      const mockPartnerId = 'partner-uuid';

      // Resubmitting V2 creates V3
      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockUploadV2, version: 2, partner_id: mockPartnerId }]])
        .mockResolvedValueOnce([{ insertId: 1, id: 'upload-v3-uuid' }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await partnerService.resubmitUpload(mockUploadV2, mockPartnerId);

      const insertCall = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('INSERT INTO data_uploads')
      );

      expect(insertCall[1]).toContain(3); // version 3
    });
  });

  describe('soft delete - query filtering', () => {
    it('should filter deleted uploads with WHERE deleted_at IS NULL', async () => {
      const mockPartnerId = uuidv4();

      mockConnection.query.mockResolvedValueOnce([
        [
          { id: 'upload-v2', version: 2, deleted_at: null }, // Active
          // V1 filtered out by WHERE clause
        ],
        [{ total: 1 }],
      ]);

      await partnerService.getRejectedUploads(mockPartnerId, { page: 1, limit: 10 });

      const selectCall = mockConnection.query.mock.calls[0];
      expect(selectCall[0]).toContain('deleted_at IS NULL');
    });

    it.skip('should include deleted_at column in SELECT queries', async () => {
      const mockPartnerId = uuidv4();

      mockConnection.query.mockResolvedValueOnce([
        [
          { id: 'upload-1', version: 1, deleted_at: null },
          { id: 'upload-2', version: 2, deleted_at: null },
        ],
        [{ total: 2 }],
      ]);

      await partnerService.getPartnerUploads(mockPartnerId);

      const selectCall = mockConnection.query.mock.calls[0];
      expect(selectCall[0]).toContain('deleted_at');
    });
  });

  describe('edit tracking - data_edit_logs', () => {
    it.skip('should log edits in data_edit_logs with partner user ID', async () => {
      const mockUploadId = uuidv4();
      const mockUserId = uuidv4();
      const mockPartnerId = 'partner-uuid';
      const mockStudents = [
        {
          id: 'student-uuid',
          student_name: 'John Doe Updated',
          email: 'john.updated@test.com',
        },
      ];
      const mockChanges = [
        {
          studentId: 'student-uuid',
          field: 'student_name',
          oldValue: 'John Doe',
          newValue: 'John Doe Updated',
        },
        {
          studentId: 'student-uuid',
          field: 'email',
          oldValue: 'john@test.com',
          newValue: 'john.updated@test.com',
        },
      ];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]]) // verify center
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update student
        .mockResolvedValueOnce([{ insertId: 1 }]) // log change 1
        .mockResolvedValueOnce([{ insertId: 2 }]); // log change 2

      await partnerService.saveEditedStudents(
        mockUploadId,
        mockCenterId,
        mockStudents,
        mockChanges,
        mockPartnerId
      );

      // Verify edit logs inserted
      const logCalls = mockConnection.query.mock.calls.filter((call) =>
        call[0].includes('INSERT INTO data_edit_logs')
      );

      expect(logCalls).toHaveLength(2);

      // Verify edited_by = partner user ID
      logCalls.forEach((call) => {
        expect(call[1]).toContain(mockPartnerId);
      });
    });

    it('should mark students with is_edited = 1', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockPartnerId = uuidv4();
      const mockStudents = [
        {
          id: 'student-uuid',
          student_name: 'Updated Name',
        },
      ];
      const mockChanges = [
        {
          studentId: 'student-uuid',
          field: 'student_name',
          oldValue: 'Old Name',
          newValue: 'Updated Name',
        },
      ];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      await partnerService.saveEditedStudents(
        mockUploadId,
        mockCenterId,
        mockStudents,
        mockChanges,
        mockPartnerId
      );

      // Verify UPDATE includes is_edited = 1
      const updateCall = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('UPDATE uploaded_students')
      );

      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('is_edited = 1');
    });
  });

  describe('edit history visibility', () => {
    it('should fetch edit history for partner', async () => {
      const mockUploadId = uuidv4();

      mockConnection.query.mockResolvedValueOnce([
        [
          {
            student_id: 'student-1',
            field_name: 'email',
            old_value: 'old@test.com',
            new_value: 'new@test.com',
            edited_by: 'partner-uuid',
            created_at: new Date(),
          },
          {
            student_id: 'student-1',
            field_name: 'mobile_number',
            old_value: '1234567890',
            new_value: '0987654321',
            edited_by: 'admin-uuid',
            created_at: new Date(),
          },
        ],
      ]);

      const history = await partnerService.getUploadChanges(mockUploadId);

      expect(history).toHaveLength(2);
      expect(history[0]).toHaveProperty('edited_by');
      expect(history[1]).toHaveProperty('edited_by');
    });

    it('should show both partner and admin edits in history', async () => {
      const mockUploadId = uuidv4();

      mockConnection.query.mockResolvedValueOnce([
        [
          { student_id: 's1', field_name: 'name', edited_by: 'partner-uuid' },
          { student_id: 's1', field_name: 'email', edited_by: 'admin-uuid' },
        ],
      ]);

      const history = await partnerService.getUploadChanges(mockUploadId);

      const partnerEdits = history.filter((h) => h.edited_by === 'partner-uuid');
      const adminEdits = history.filter((h) => h.edited_by === 'admin-uuid');

      expect(partnerEdits).toHaveLength(1);
      expect(adminEdits).toHaveLength(1);
    });
  });

  describe('rejected centers - composite workflow', () => {
    it('should get rejected centers for a partner upload', async () => {
      const mockUploadId = uuidv4();

      mockConnection.query.mockResolvedValueOnce([
        [
          {
            id: 'center-1',
            center_name: 'Test Center',
            review_status: 'rejected',
            rejection_reason: 'Data quality issues',
          },
        ],
      ]);

      const centers = await partnerService.getRejectedCenters(mockUploadId);

      expect(centers).toHaveLength(1);
      expect(centers[0].review_status).toBe('rejected');
      expect(centers[0]).toHaveProperty('rejection_reason');
    });

    it('should allow editing rejected centers only', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockPartnerId = uuidv4();

      // Mock: Center is rejected
      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId, review_status: 'rejected' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      const mockStudents = [{ id: 's1', student_name: 'Test' }];
      const mockChanges = [
        { studentId: 's1', field: 'student_name', oldValue: 'Old', newValue: 'Test' },
      ];

      await expect(
        partnerService.saveEditedStudents(
          mockUploadId,
          mockCenterId,
          mockStudents,
          mockChanges,
          mockPartnerId
        )
      ).resolves.not.toThrow();
    });

    it('should prevent editing approved centers', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockPartnerId = uuidv4();

      // Mock: Center is approved (should fail)
      mockConnection.query.mockResolvedValueOnce([
        [{ id: mockCenterId, review_status: 'approved' }],
      ]);

      const mockStudents = [{ id: 's1', student_name: 'Test' }];
      const mockChanges = [];

      await expect(
        partnerService.saveEditedStudents(
          mockUploadId,
          mockCenterId,
          mockStudents,
          mockChanges,
          mockPartnerId
        )
      ).rejects.toThrow();
    });
  });

  describe('transaction safety', () => {
    it('should rollback on edit save failure', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockPartnerId = uuidv4();
      const mockStudents = [{ id: 's1', student_name: 'Test' }];
      const mockChanges = [{ studentId: 's1', field: 'name', oldValue: 'Old', newValue: 'Test' }];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]])
        .mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        partnerService.saveEditedStudents(
          mockUploadId,
          mockCenterId,
          mockStudents,
          mockChanges,
          mockPartnerId
        )
      ).rejects.toThrow();

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('partner_student_id references', () => {
    it('should use partner_student_id in all queries', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockPartnerId = uuidv4();
      const mockStudents = [
        {
          id: 'student-uuid',
          partner_student_id: 'S001',
          student_name: 'John Doe',
        },
      ];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await partnerService.saveEditedStudents(
        mockUploadId,
        mockCenterId,
        mockStudents,
        [],
        mockPartnerId
      );

      const updateCall = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('UPDATE uploaded_students')
      );

      expect(updateCall[0]).toContain('partner_student_id');
      expect(updateCall[1]).toContain('S001');
    });
  });
});
