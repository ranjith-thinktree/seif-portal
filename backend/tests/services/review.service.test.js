const reviewService = require('../../src/api/v1/services/review.service');
const db = require('../../src/database/connection');
const { v4: uuidv4 } = require('uuid');

jest.mock('../../src/database/connection');

describe('Review Service - Admin Editing Tests', () => {
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

  describe('saveAdminEdits - during initial review', () => {
    it('should save edits to uploaded_students table', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockAdminId = uuidv4();
      const mockStudents = [
        {
          id: 'student-uuid',
          partner_student_id: 'S001',
          student_name: 'John Doe Updated',
          email: 'john.updated@test.com',
          mobile_number: '9876543210',
          gender: 'Male',
          course_name: 'Web Development',
          batch_number: 'B001',
          training_status: 'enrolled',
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

      // Mock: Center exists
      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]]) // verify center
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update student
        .mockResolvedValueOnce([{ insertId: 1 }]) // log change 1
        .mockResolvedValueOnce([{ insertId: 2 }]); // log change 2

      const result = await reviewService.saveAdminEdits(
        mockUploadId,
        mockCenterId,
        mockStudents,
        mockChanges,
        mockAdminId
      );

      expect(result.updatedStudents).toBe(1);
      expect(result.loggedChanges).toBe(2);

      // Verify UPDATE query
      const updateCall = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('UPDATE uploaded_students')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('is_edited = 1');
    });

    it('should log changes in data_edit_logs with admin user ID', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockAdminId = uuidv4();
      const mockStudents = [{ id: 's1', student_name: 'Test' }];
      const mockChanges = [
        {
          studentId: 's1',
          field: 'student_name',
          oldValue: 'Old Name',
          newValue: 'Test',
        },
      ];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      await reviewService.saveAdminEdits(
        mockUploadId,
        mockCenterId,
        mockStudents,
        mockChanges,
        mockAdminId
      );

      // Verify data_edit_logs INSERT has edited_by = admin
      const logCall = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('INSERT INTO data_edit_logs')
      );

      expect(logCall).toBeDefined();
      expect(logCall[0]).toContain('edited_by');
      expect(logCall[1]).toContain(mockAdminId);
    });

    it('should mark students with is_edited = 1', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockAdminId = uuidv4();
      const mockStudents = [{ id: 's1', student_name: 'Test', partner_student_id: 'S001' }];
      const mockChanges = [];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      await reviewService.saveAdminEdits(
        mockUploadId,
        mockCenterId,
        mockStudents,
        mockChanges,
        mockAdminId
      );

      const updateCall = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('UPDATE uploaded_students')
      );

      expect(updateCall[0]).toContain('is_edited = 1');
    });

    it('should handle multiple students in batch', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockAdminId = uuidv4();
      const mockStudents = [
        { id: 's1', partner_student_id: 'S001', student_name: 'Student 1' },
        { id: 's2', partner_student_id: 'S002', student_name: 'Student 2' },
        { id: 's3', partner_student_id: 'S003', student_name: 'Student 3' },
      ];
      const mockChanges = [
        { studentId: 's1', field: 'student_name', oldValue: 'Old 1', newValue: 'Student 1' },
        { studentId: 's2', field: 'student_name', oldValue: 'Old 2', newValue: 'Student 2' },
        { studentId: 's3', field: 'student_name', oldValue: 'Old 3', newValue: 'Student 3' },
      ];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update s1
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update s2
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update s3
        .mockResolvedValueOnce([{ insertId: 1 }]) // log s1
        .mockResolvedValueOnce([{ insertId: 2 }]) // log s2
        .mockResolvedValueOnce([{ insertId: 3 }]); // log s3

      const result = await reviewService.saveAdminEdits(
        mockUploadId,
        mockCenterId,
        mockStudents,
        mockChanges,
        mockAdminId
      );

      expect(result.updatedStudents).toBe(3);
      expect(result.loggedChanges).toBe(3);
    });
  });

  describe('approveCenter - with edited data', () => {
    it('should copy edited data to production students table', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockAdminId = uuidv4();

      // Mock center and students (including edited ones)
      mockConnection.query
        .mockResolvedValueOnce([
          [
            {
              id: mockCenterId,
              partner_id: 'partner-uuid',
              center_name: 'Test Center',
              csv_center_id: 'C001',
              review_status: 'pending',
            },
          ],
        ]) // get center
        .mockResolvedValueOnce([[]]) // check existing center
        .mockResolvedValueOnce([{ insertId: 1, id: 'approved-center-uuid' }]) // insert center
        .mockResolvedValueOnce([[]]) // get batches
        .mockResolvedValueOnce([
          [
            {
              id: 'student-1',
              partner_student_id: 'S001',
              student_name: 'John Doe EDITED', // Admin edited this
              is_edited: 1,
              gender: 'Male',
              course_name: 'Web Dev',
              batch_number: 'B001',
            },
            {
              id: 'student-2',
              partner_student_id: 'S002',
              student_name: 'Jane Doe', // Not edited
              is_edited: 0,
              gender: 'Female',
              course_name: 'Data Science',
              batch_number: 'B001',
            },
          ],
        ]); // get students (with edits)

      // Continue mocking for student inserts and updates...
      mockConnection.query
        .mockResolvedValueOnce([{ insertId: 1 }]) // insert student 1
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update uploaded_students 1
        .mockResolvedValueOnce([{ insertId: 2 }]) // insert student 2
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update uploaded_students 2
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update uploaded_centers
        .mockResolvedValueOnce([[{ version: 1 }]]); // check version

      await reviewService.approveCenter(mockUploadId, mockCenterId, mockAdminId);

      // Verify students INSERT used edited data
      const studentInserts = mockConnection.query.mock.calls.filter((call) =>
        call[0].includes('INSERT INTO students')
      );

      expect(studentInserts).toHaveLength(2);
      expect(studentInserts[0][1]).toContain('John Doe EDITED'); // Admin's edit
      expect(studentInserts[1][1]).toContain('Jane Doe'); // Original data
    });

    it('should handle approval after admin edits', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockAdminId = uuidv4();

      // Simulate: Admin edited data → Approve → Data goes to production

      // First: Admin saves edits
      const mockStudents = [
        {
          id: 'student-uuid',
          partner_student_id: 'S001',
          student_name: 'Admin Edited Name',
        },
      ];
      const mockChanges = [
        {
          studentId: 'student-uuid',
          field: 'student_name',
          oldValue: 'Original Name',
          newValue: 'Admin Edited Name',
        },
      ];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      await reviewService.saveAdminEdits(
        mockUploadId,
        mockCenterId,
        mockStudents,
        mockChanges,
        mockAdminId
      );

      expect(mockConnection.commit).toHaveBeenCalled();

      // Then: Admin approves
      jest.clearAllMocks();

      mockConnection.query
        .mockResolvedValueOnce([
          [{ id: mockCenterId, partner_id: 'p1', center_name: 'C1', review_status: 'pending' }],
        ])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([
          [
            {
              id: 'student-uuid',
              partner_student_id: 'S001',
              student_name: 'Admin Edited Name', // Edited data fetched
              is_edited: 1,
            },
          ],
        ])
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ version: 1 }]]);

      await reviewService.approveCenter(mockUploadId, mockCenterId, mockAdminId);

      // Verify production insert has edited data
      const productionInsert = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('INSERT INTO students')
      );

      expect(productionInsert[1]).toContain('Admin Edited Name');
    });
  });

  describe('edit history - admin vs partner visibility', () => {
    it('should show admin edits in history with admin user ID', async () => {
      const mockStudentId = uuidv4();

      mockConnection.query.mockResolvedValueOnce([
        [
          {
            field_name: 'student_name',
            old_value: 'Original',
            new_value: 'Admin Edit',
            edited_by: 'admin-uuid',
            created_at: new Date(),
          },
          {
            field_name: 'email',
            old_value: 'old@test.com',
            new_value: 'new@test.com',
            edited_by: 'partner-uuid',
            created_at: new Date(),
          },
        ],
      ]);

      const history = await reviewService.getStudentEditHistory(mockStudentId);

      expect(history).toHaveLength(2);

      const adminEdit = history.find((h) => h.edited_by === 'admin-uuid');
      const partnerEdit = history.find((h) => h.edited_by === 'partner-uuid');

      expect(adminEdit).toBeDefined();
      expect(partnerEdit).toBeDefined();
    });

    it('should be visible to both admin and partner', async () => {
      // This is a business requirement test
      const mockStudentId = uuidv4();

      mockConnection.query.mockResolvedValueOnce([
        [
          { field_name: 'name', edited_by: 'admin-uuid', old_value: 'A', new_value: 'B' },
          { field_name: 'email', edited_by: 'partner-uuid', old_value: 'C', new_value: 'D' },
        ],
      ]);

      const history = await reviewService.getStudentEditHistory(mockStudentId);

      // Both types of edits should be present
      expect(history.some((h) => h.edited_by === 'admin-uuid')).toBe(true);
      expect(history.some((h) => h.edited_by === 'partner-uuid')).toBe(true);
    });
  });

  describe('transaction safety', () => {
    it('should rollback admin edits on error', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockAdminId = uuidv4();
      const mockStudents = [{ id: 's1', student_name: 'Test' }];
      const mockChanges = [{ studentId: 's1', field: 'name', oldValue: 'Old', newValue: 'Test' }];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]])
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        reviewService.saveAdminEdits(
          mockUploadId,
          mockCenterId,
          mockStudents,
          mockChanges,
          mockAdminId
        )
      ).rejects.toThrow();

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should commit successfully on valid admin edits', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockAdminId = uuidv4();
      const mockStudents = [{ id: 's1', student_name: 'Test', partner_student_id: 'S001' }];
      const mockChanges = [{ studentId: 's1', field: 'name', oldValue: 'Old', newValue: 'Test' }];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: mockCenterId }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      await reviewService.saveAdminEdits(
        mockUploadId,
        mockCenterId,
        mockStudents,
        mockChanges,
        mockAdminId
      );

      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('validation - center verification', () => {
    it('should throw error if center not found in upload', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = 'non-existent-center';
      const mockAdminId = uuidv4();
      const mockStudents = [];
      const mockChanges = [];

      // Mock: Center NOT found
      mockConnection.query.mockResolvedValueOnce([[]]);

      await expect(
        reviewService.saveAdminEdits(
          mockUploadId,
          mockCenterId,
          mockStudents,
          mockChanges,
          mockAdminId
        )
      ).rejects.toThrow('Center not found in upload');

      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should verify center belongs to correct upload', async () => {
      const mockUploadId = uuidv4();
      const mockCenterId = uuidv4();
      const mockAdminId = uuidv4();

      mockConnection.query.mockResolvedValueOnce([[{ id: mockCenterId }]]);

      // Verify query checks both center ID and upload ID
      const verifyCall = mockConnection.query.mock.calls.find((call) =>
        call[0].includes('SELECT id FROM uploaded_centers')
      );

      expect(verifyCall[0]).toContain('data_upload_id = ?');
      expect(verifyCall[1]).toContain(mockUploadId);
    });
  });
});
