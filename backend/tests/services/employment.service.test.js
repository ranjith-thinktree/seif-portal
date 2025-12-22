const employmentService = require('../../src/api/v1/services/employment.service');
const db = require('../../src/database/connection');
const ExcelJS = require('exceljs');

jest.mock('../../src/database/connection');
jest.mock('exceljs');

describe('Employment Service - Unit Tests', () => {
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

  describe('processEmploymentUpload - student matching', () => {
    it('should match students by (partner_id + partner_student_id)', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S001', // Partner's student ID
          company_name: 'Tech Corp',
          designation: 'Developer',
          employment_date: '2024-01-15',
          salary: 50000,
        },
      ];

      // Mock: Student exists with matching partner_id and partner_student_id
      mockConnection.query
        .mockResolvedValueOnce([
          [{ id: 'student-uuid', partner_student_id: 'S001', partner_id: mockPartnerId }],
        ]) // find student
        .mockResolvedValueOnce([{ insertId: 1 }]) // insert employment
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // update student employment_status

      const result = await employmentService.processEmploymentUpload(
        mockPartnerId,
        mockUploadId,
        mockCsvData,
        'test.csv'
      );

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);

      // Verify query used composite key
      const studentQuery = mockConnection.query.mock.calls[0];
      expect(studentQuery[0]).toContain('partner_id = ?');
      expect(studentQuery[0]).toContain('partner_student_id = ?');
      expect(studentQuery[1]).toContain(mockPartnerId);
      expect(studentQuery[1]).toContain('S001');
    });

    it('should log error for non-existent student', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S999', // Does not exist
          company_name: 'Tech Corp',
          designation: 'Developer',
          employment_date: '2024-01-15',
          salary: 50000,
        },
      ];

      // Mock: Student NOT found
      mockConnection.query.mockResolvedValueOnce([[]]); // empty result

      const result = await employmentService.processEmploymentUpload(
        mockPartnerId,
        mockUploadId,
        mockCsvData,
        'test.csv'
      );

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.error_log).toHaveLength(1);
      expect(result.error_log[0].error).toContain('Student not found');
      expect(result.error_log[0].student_id).toBe('S999');
    });

    it('should process multiple students in batch', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S001',
          company_name: 'Company A',
          designation: 'Dev',
          employment_date: '2024-01-15',
          salary: 50000,
        },
        {
          student_id: 'S002',
          company_name: 'Company B',
          designation: 'QA',
          employment_date: '2024-01-20',
          salary: 45000,
        },
        {
          student_id: 'S999',
          company_name: 'Company C',
          designation: 'PM',
          employment_date: '2024-01-25',
          salary: 60000,
        }, // Non-existent
      ];

      // Mock responses for each student
      mockConnection.query
        .mockResolvedValueOnce([[{ id: 'student-1', partner_student_id: 'S001' }]]) // S001 found
        .mockResolvedValueOnce([{ insertId: 1 }]) // employment insert
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update status
        .mockResolvedValueOnce([[{ id: 'student-2', partner_student_id: 'S002' }]]) // S002 found
        .mockResolvedValueOnce([{ insertId: 2 }]) // employment insert
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // update status
        .mockResolvedValueOnce([[]]); // S999 NOT found

      const result = await employmentService.processEmploymentUpload(
        mockPartnerId,
        mockUploadId,
        mockCsvData,
        'test.csv'
      );

      expect(result.total).toBe(3);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.error_log).toHaveLength(1);
      expect(result.error_log[0].student_id).toBe('S999');
    });
  });

  describe('error logging with row numbers', () => {
    it('should include CSV row number in error log', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S001',
          company_name: 'Company A',
          designation: 'Dev',
          employment_date: '2024-01-15',
          salary: 50000,
        },
        {
          student_id: 'S999',
          company_name: 'Company B',
          designation: 'QA',
          employment_date: '2024-01-20',
          salary: 45000,
        }, // Row 3 (header=1, S001=2)
      ];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: 'student-1' }]]) // S001 OK
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[]]); // S999 NOT found

      const result = await employmentService.processEmploymentUpload(
        mockPartnerId,
        mockUploadId,
        mockCsvData,
        'test.csv'
      );

      expect(result.error_log[0].row).toBe(3); // Header=1, S001=2, S999=3
    });

    it('should include error message in log', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S999',
          company_name: '',
          designation: 'Dev',
          employment_date: '2024-01-15',
          salary: 'invalid',
        },
      ];

      mockConnection.query.mockResolvedValueOnce([[]]); // Student not found

      const result = await employmentService.processEmploymentUpload(
        mockPartnerId,
        mockUploadId,
        mockCsvData,
        'test.csv'
      );

      expect(result.error_log[0]).toMatchObject({
        row: 2,
        student_id: 'S999',
        error: expect.stringContaining('Student not found'),
      });
    });
  });

  describe('success/failure statistics', () => {
    it('should return correct statistics', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S001',
          company_name: 'A',
          designation: 'Dev',
          employment_date: '2024-01-15',
          salary: 50000,
        },
        {
          student_id: 'S002',
          company_name: 'B',
          designation: 'QA',
          employment_date: '2024-01-20',
          salary: 45000,
        },
        {
          student_id: 'S003',
          company_name: 'C',
          designation: 'PM',
          employment_date: '2024-01-25',
          salary: 60000,
        },
        {
          student_id: 'S999',
          company_name: 'D',
          designation: 'BA',
          employment_date: '2024-01-30',
          salary: 55000,
        },
      ];

      // 3 success, 1 failure
      mockConnection.query
        .mockResolvedValueOnce([[{ id: '1' }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]) // S001 OK
        .mockResolvedValueOnce([[{ id: '2' }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]) // S002 OK
        .mockResolvedValueOnce([[{ id: '3' }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]) // S003 OK
        .mockResolvedValueOnce([[]]); // S999 FAIL

      const result = await employmentService.processEmploymentUpload(
        mockPartnerId,
        mockUploadId,
        mockCsvData,
        'test.csv'
      );

      expect(result).toMatchObject({
        total: 4,
        processed: 3,
        failed: 1,
      });
    });
  });

  describe('employment_status update', () => {
    it('should update student employment_status to employed', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S001',
          company_name: 'Tech Corp',
          designation: 'Developer',
          employment_date: '2024-01-15',
          salary: 50000,
        },
      ];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: 'student-uuid' }]]) // find student
        .mockResolvedValueOnce([{ insertId: 1 }]) // insert employment
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // update status

      await employmentService.processEmploymentUpload(
        mockPartnerId,
        mockUploadId,
        mockCsvData,
        'test.csv'
      );

      // Verify update query
      const updateCall = mockConnection.query.mock.calls.find(
        (call) => call[0].includes('UPDATE students') && call[0].includes('employment_status')
      );

      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain("employment_status = 'employed'");
    });
  });

  describe('template generation', () => {
    it('should generate Excel template with dropdowns', async () => {
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue({
          columns: [],
          addRow: jest.fn(),
          getColumn: jest.fn().mockReturnValue({
            width: 20,
          }),
          dataValidations: {
            add: jest.fn(),
          },
        }),
        xlsx: {
          writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel')),
        },
      };

      ExcelJS.Workbook = jest.fn(() => mockWorkbook);

      const buffer = await employmentService.generateTemplate();

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Employment Data');
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('validation rules', () => {
    it('should validate required fields', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S001',
          company_name: '', // Missing required field
          designation: 'Developer',
          employment_date: '2024-01-15',
        },
      ];

      mockConnection.query.mockResolvedValueOnce([[{ id: 'student-uuid' }]]);

      const result = await employmentService.processEmploymentUpload(
        mockPartnerId,
        mockUploadId,
        mockCsvData,
        'test.csv'
      );

      expect(result.failed).toBeGreaterThan(0);
      expect(result.error_log[0].error).toMatch(/company_name|required/i);
    });

    it('should validate date format', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S001',
          company_name: 'Tech Corp',
          designation: 'Developer',
          employment_date: 'invalid-date',
          salary: 50000,
        },
      ];

      mockConnection.query.mockResolvedValueOnce([[{ id: 'student-uuid' }]]);

      const result = await employmentService.processEmploymentUpload(
        mockPartnerId,
        mockUploadId,
        mockCsvData,
        'test.csv'
      );

      // Depending on implementation, might fail or convert to NULL
      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('transaction handling', () => {
    it('should rollback on error', async () => {
      const mockPartnerId = 'partner-uuid';
      const mockUploadId = 'employment-upload-uuid';
      const mockCsvData = [
        {
          student_id: 'S001',
          company_name: 'Tech Corp',
          designation: 'Developer',
          employment_date: '2024-01-15',
          salary: 50000,
        },
      ];

      mockConnection.query
        .mockResolvedValueOnce([[{ id: 'student-uuid' }]])
        .mockRejectedValueOnce(new Error('Database error')); // Insert fails

      await expect(
        employmentService.processEmploymentUpload(
          mockPartnerId,
          mockUploadId,
          mockCsvData,
          'test.csv'
        )
      ).rejects.toThrow();

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
});
