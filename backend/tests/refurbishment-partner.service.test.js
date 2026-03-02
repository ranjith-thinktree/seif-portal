const RefurbishmentService = require('../src/api/v1/services/refurbishment.service');
const db = require('../src/database/connection');
const { v4: uuidv4 } = require('uuid');

// Mock database connection
jest.mock('../src/database/connection');

describe('RefurbishmentService - Partner Methods', () => {
  let mockConnection;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock connection object
    mockConnection = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
    };

    // Mock db.getConnection to return the mockConnection
    db.getConnection = jest.fn().mockResolvedValue(mockConnection);
  });

  describe('getPartnerRequestDetails', () => {
    const requestId = uuidv4();
    const partnerId = uuidv4();
    const centerId = uuidv4();
    const courseId = uuidv4();

    it('should return request details for valid request', async () => {
      const mockRows = [
        {
          refurbishment_request_id: uuidv4(),
          request_id: requestId,
          center_id: centerId,
          is_upgradation_requested: false,
          center_name: 'Test Center',
          address: '123 Test St',
          partner_id: partnerId,
          admin_remarks: 'Please review and select packages',
          status: 'pending',
          course_id: courseId,
          course_name: 'Electrical',
          package_id: uuidv4(),
          package_name: 'Multimeter Set',
          description: 'Digital multimeters',
        },
      ];

      // Single JOIN query returns all data at once
      db.query.mockResolvedValueOnce([mockRows]);

      const result = await RefurbishmentService.getPartnerRequestDetails(requestId, partnerId);

      expect(result).toBeDefined();
      expect(result.request_id).toBe(requestId);
      expect(result.center_name).toBe('Test Center');
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0].course_name).toBe('Electrical');
      expect(result.courses[0].packages).toHaveLength(1);
      expect(result.courses[0].packages[0].package_name).toBe('Multimeter Set');
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should return null if request not found', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const result = await RefurbishmentService.getPartnerRequestDetails(requestId, partnerId);

      expect(result).toBeNull();
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should return null if partner does not own request', async () => {
      const differentPartnerId = uuidv4();
      db.query.mockResolvedValueOnce([[]]);

      const result = await RefurbishmentService.getPartnerRequestDetails(
        requestId,
        differentPartnerId
      );

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        RefurbishmentService.getPartnerRequestDetails(requestId, partnerId)
      ).rejects.toThrow('Database error');
    });

    it('should group packages by course correctly', async () => {
      const course1Id = uuidv4();
      const course2Id = uuidv4();

      const mockRows = [
        // Course 1 - Electrical (2 packages)
        {
          refurbishment_request_id: uuidv4(),
          request_id: requestId,
          center_id: centerId,
          is_upgradation_requested: false,
          center_name: 'Test Center',
          address: '123 Test St',
          partner_id: partnerId,
          admin_remarks: 'Please review',
          status: 'pending',
          course_id: course1Id,
          course_name: 'Electrical',
          package_id: uuidv4(),
          package_name: 'Multimeter',
          description: 'Digital multimeter',
        },
        {
          refurbishment_request_id: uuidv4(),
          request_id: requestId,
          center_id: centerId,
          is_upgradation_requested: false,
          center_name: 'Test Center',
          address: '123 Test St',
          partner_id: partnerId,
          admin_remarks: 'Please review',
          status: 'pending',
          course_id: course1Id,
          course_name: 'Electrical',
          package_id: uuidv4(),
          package_name: 'Oscilloscope',
          description: 'Digital oscilloscope',
        },
        // Course 2 - Solar (1 package)
        {
          refurbishment_request_id: uuidv4(),
          request_id: requestId,
          center_id: centerId,
          is_upgradation_requested: false,
          center_name: 'Test Center',
          address: '123 Test St',
          partner_id: partnerId,
          admin_remarks: 'Please review',
          status: 'pending',
          course_id: course2Id,
          course_name: 'Solar',
          package_id: uuidv4(),
          package_name: 'Solar Panel Kit',
          description: 'Solar panel installation kit',
        },
      ];

      db.query.mockResolvedValueOnce([mockRows]);

      const result = await RefurbishmentService.getPartnerRequestDetails(requestId, partnerId);

      expect(result.courses).toHaveLength(2);
      expect(result.courses[0].packages).toHaveLength(2);
      expect(result.courses[1].packages).toHaveLength(1);
    });
  });

  describe('submitPartnerRefurbishmentSelections', () => {
    const requestId = uuidv4();
    const partnerId = uuidv4();
    const userId = uuidv4();
    const refurbishmentRequestId = uuidv4();
    const courseId = uuidv4();
    const packageId = uuidv4();

    const submissionData = {
      requestId,
      partnerId,
      userId,
      courses: [
        {
          course_id: courseId,
          package_ids: [packageId],
          justification: 'Equipment is old',
          attachments: ['s3://test-bucket/photo1.jpg'], // Array of URLs not objects
        },
      ],
      upgradation: null,
    };

    // Transaction methods already mocked in main beforeEach

    it('should submit selections successfully', async () => {
      // Mock queries in order they're called in service
      mockConnection.query
        .mockResolvedValueOnce([
          [
            {
              partner_id: partnerId,
              refurbishment_request_id: refurbishmentRequestId,
              status: 'pending',
            },
          ],
        ]) // 1. Ownership check (returns partner_id AND refurbishment_request_id in ONE query)
        .mockResolvedValueOnce([[{ count: 1 }]]) // 2. Package validation (SELECT COUNT)
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 3. UPDATE request status
        .mockResolvedValueOnce([{ insertId: 1 }]) // 4. INSERT course package
        .mockResolvedValueOnce([{ insertId: 1 }]) // 5. INSERT attachment
        .mockResolvedValueOnce([{ insertId: 1 }]) // 6. INSERT notification
        .mockResolvedValueOnce([
          [{ id: requestId, status: 'partner_submitted', updated_at: new Date() }],
        ]); // 7. SELECT updated request

      const result =
        await RefurbishmentService.submitPartnerRefurbishmentSelections(submissionData);

      expect(result).toBeDefined();
      expect(result.request_id).toBe(requestId);
      expect(result.status).toBe('partner_submitted');
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.rollback).not.toHaveBeenCalled();
    });

    it('should rollback on validation failure', async () => {
      // Mock request not found
      mockConnection.query.mockResolvedValueOnce([[]]);

      await expect(
        RefurbishmentService.submitPartnerRefurbishmentSelections(submissionData)
      ).rejects.toThrow();

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
    });

    it('should rollback on database error', async () => {
      mockConnection.query
        .mockResolvedValueOnce([
          [
            {
              partner_id: partnerId,
              refurbishment_request_id: refurbishmentRequestId,
              status: 'pending',
            },
          ],
        ]) // Ownership check
        .mockResolvedValueOnce([[{ request_id: requestId, status: 'pending' }]])
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        RefurbishmentService.submitPartnerRefurbishmentSelections(submissionData)
      ).rejects.toThrow('Database error');

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
    });

    it('should handle upgradation request', async () => {
      const submissionWithUpgradation = {
        ...submissionData,
        upgradation: {
          room_name: 'Lab Room 1',
          length_meters: 12.5,
          breadth_meters: 8.0,
          height_meters: 3.5,
          justification: 'Room too small',
          photos: ['s3://test-bucket/room1.jpg'], // Array of URLs not objects
        },
      };

      mockConnection.query
        .mockResolvedValueOnce([
          [
            {
              partner_id: partnerId,
              refurbishment_request_id: refurbishmentRequestId,
              status: 'pending',
            },
          ],
        ]) // 1. Ownership check
        .mockResolvedValueOnce([[{ count: 1 }]]) // 2. Package validation
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 3. UPDATE request status
        .mockResolvedValueOnce([{ insertId: 1 }]) // 4. INSERT course package
        .mockResolvedValueOnce([{ insertId: 1 }]) // 5. INSERT attachment
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 6. UPDATE refurbishment_requests (is_upgradation_requested)
        .mockResolvedValueOnce([{ insertId: 1 }]) // 7. INSERT room details
        .mockResolvedValueOnce([{ insertId: 1 }]) // 8. INSERT room photo
        .mockResolvedValueOnce([{ insertId: 1 }]) // 9. INSERT notification
        .mockResolvedValueOnce([
          [{ id: requestId, status: 'partner_submitted', updated_at: new Date() }],
        ]); // 10. SELECT updated request

      const result =
        await RefurbishmentService.submitPartnerRefurbishmentSelections(submissionWithUpgradation);

      expect(result.request_id).toBe(requestId);
      expect(result.status).toBe('partner_submitted');
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should verify package_ids against admin pre-selections', async () => {
      const unauthorizedPackageId = uuidv4();
      const submissionWithBadPackage = {
        ...submissionData,
        courses: [
          {
            course_id: courseId,
            package_ids: [unauthorizedPackageId],
            justification: 'Test',
            attachments: [],
          },
        ],
      };

      mockConnection.query
        .mockResolvedValueOnce([[{ request_id: requestId, status: 'pending' }]])
        .mockResolvedValueOnce([[{ id: refurbishmentRequestId }]])
        .mockResolvedValueOnce([[]]); // Package not pre-selected

      await expect(
        RefurbishmentService.submitPartnerRefurbishmentSelections(submissionWithBadPackage)
      ).rejects.toThrow();

      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should reject if request not in pending status', async () => {
      mockConnection.query.mockResolvedValueOnce([[{ request_id: requestId, status: 'approved' }]]);

      await expect(
        RefurbishmentService.submitPartnerRefurbishmentSelections(submissionData)
      ).rejects.toThrow();

      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should create admin notification on successful submission', async () => {
      mockConnection.query
        .mockResolvedValueOnce([
          [
            {
              partner_id: partnerId,
              refurbishment_request_id: refurbishmentRequestId,
              status: 'pending',
            },
          ],
        ]) // 1. Ownership check
        .mockResolvedValueOnce([[{ count: 1 }]]) // 2. Package validation
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // 3. UPDATE request status
        .mockResolvedValueOnce([{ insertId: 1 }]) // 4. INSERT course package
        .mockResolvedValueOnce([{ insertId: 1 }]) // 5. INSERT attachment
        .mockResolvedValueOnce([{ insertId: 1 }]) // 6. INSERT notification
        .mockResolvedValueOnce([
          [{ id: requestId, status: 'partner_submitted', updated_at: new Date() }],
        ]); // 7. SELECT updated request

      const result =
        await RefurbishmentService.submitPartnerRefurbishmentSelections(submissionData);

      expect(result.request_id).toBe(requestId);
      expect(result.status).toBe('partner_submitted');

      // Verify notification was created (6th query call)
      const notificationQueryCall = mockConnection.query.mock.calls[5]; // 0-indexed, so 5 is the 6th call
      expect(notificationQueryCall[0]).toContain('INSERT INTO notifications');
    });
  });

  describe('getPartnerRefurbishmentRequests', () => {
    const partnerId = uuidv4();

    it('should return paginated requests', async () => {
      const mockRequests = [
        {
          request_id: uuidv4(),
          request_number: 'REQ-2024-001',
          center_name: 'Test Center 1',
          status: 'pending',
          created_at: new Date(),
        },
        {
          request_id: uuidv4(),
          request_number: 'REQ-2024-002',
          center_name: 'Test Center 2',
          status: 'partner_submitted',
          created_at: new Date(),
        },
      ];

      db.query
        .mockResolvedValueOnce([[{ total: 15 }]]) // Count query (runs first in service)
        .mockResolvedValueOnce([mockRequests]); // Requests query

      const result = await RefurbishmentService.getPartnerRefurbishmentRequests({
        partnerId,
        limit: 10,
        offset: 0,
      });

      expect(result.requests).toHaveLength(2);
      expect(result.total).toBe(15);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should filter by status if provided', async () => {
      const mockRequests = [
        {
          request_id: uuidv4(),
          status: 'pending',
        },
      ];

      db.query
        .mockResolvedValueOnce([[{ total: 5 }]]) // Count query (runs first in service)
        .mockResolvedValueOnce([mockRequests]); // Requests query

      const result = await RefurbishmentService.getPartnerRefurbishmentRequests({
        partnerId,
        limit: 10,
        offset: 0,
        status: 'pending',
      });

      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].status).toBe('pending');

      // Verify status filter was applied in query (count query runs first)
      const firstQueryCall = db.query.mock.calls[0];
      expect(firstQueryCall[0]).toContain('AND rr.status = ?');
    });

    it('should calculate pagination metadata correctly', async () => {
      const mockRequests = Array(10)
        .fill(null)
        .map(() => ({
          request_id: uuidv4(),
          status: 'pending',
        }));

      db.query
        .mockResolvedValueOnce([[{ total: 25 }]]) // Count query (runs first in service)
        .mockResolvedValueOnce([mockRequests]); // Requests query

      const result = await RefurbishmentService.getPartnerRefurbishmentRequests({
        partnerId,
        limit: 10,
        offset: 10,
      });

      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
    });

    it('should return empty array if no requests', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 0 }]]) // Count query (runs first in service)
        .mockResolvedValueOnce([[]]); // Requests query

      const result = await RefurbishmentService.getPartnerRefurbishmentRequests({
        partnerId,
        limit: 10,
        offset: 0,
      });

      expect(result.requests).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should only return partner's requests", async () => {
      const mockRequests = [
        {
          request_id: uuidv4(),
          partner_id: partnerId,
        },
      ];

      db.query.mockResolvedValueOnce([mockRequests]).mockResolvedValueOnce([[{ total: 1 }]]);

      const result = await RefurbishmentService.getPartnerRefurbishmentRequests({
        partnerId,
        limit: 10,
        offset: 0,
      });

      // Verify partner_id filter was applied
      const firstQueryCall = db.query.mock.calls[0];
      expect(firstQueryCall[1]).toContain(partnerId);
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        RefurbishmentService.getPartnerRefurbishmentRequests({
          partnerId,
          limit: 10,
          offset: 0,
        })
      ).rejects.toThrow('Database error');
    });

    it('should use default limit and offset if not provided', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 0 }]]) // Count query (runs first in service)
        .mockResolvedValueOnce([[]]); // Requests query

      const result = await RefurbishmentService.getPartnerRefurbishmentRequests({
        partnerId,
      });

      // Verify default values were used by checking page is 1 (offset 0, limit 10)
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(0);
    });
  });
});
