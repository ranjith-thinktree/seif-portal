const RefurbishmentController = require('../src/api/v1/controllers/refurbishment.controller');
const RefurbishmentService = require('../src/api/v1/services/refurbishment.service');
const ApiResponse = require('../src/utils/response.util');
const { ValidationError } = require('../src/utils/error.util');

// Mock dependencies
jest.mock('../src/api/v1/services/refurbishment.service');
jest.mock('../src/utils/response.util');

describe('RefurbishmentController - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request, response, and next
    req = {
      query: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    // Mock ApiResponse methods
    ApiResponse.success = jest.fn();
    ApiResponse.notFound = jest.fn();
  });

  describe('getEligibleCenters()', () => {
    it('should return eligible centers with default pagination', async () => {
      // Arrange
      const mockServiceResponse = {
        centers: [
          { id: 'center-1', center_name: 'Center 1', is_eligible: 1 },
          { id: 'center-2', center_name: 'Center 2', is_eligible: 1 },
        ],
        totalCount: 2,
      };
      RefurbishmentService.getEligibleCenters.mockResolvedValue(mockServiceResponse);

      // Act
      await RefurbishmentController.getEligibleCenters(req, res, next);

      // Assert
      expect(RefurbishmentService.getEligibleCenters).toHaveBeenCalledWith(50, 0); // default pagination
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        {
          centers: mockServiceResponse.centers,
          totalCount: 2,
          pagination: {
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        },
        'Eligible centers retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return eligible centers with custom pagination', async () => {
      // Arrange
      req.query = { limit: '10', offset: '20' };
      const mockServiceResponse = {
        centers: Array(10).fill({ id: 'center', is_eligible: 1 }),
        totalCount: 100,
      };
      RefurbishmentService.getEligibleCenters.mockResolvedValue(mockServiceResponse);

      // Act
      await RefurbishmentController.getEligibleCenters(req, res, next);

      // Assert
      expect(RefurbishmentService.getEligibleCenters).toHaveBeenCalledWith(10, 20);
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          totalCount: 100,
          pagination: {
            limit: 10,
            offset: 20,
            hasMore: true, // 30 < 100
          },
        }),
        'Eligible centers retrieved successfully'
      );
    });

    it('should throw ValidationError if limit is out of range', async () => {
      // Arrange
      req.query = { limit: '200' }; // exceeds max 100

      // Act
      await RefurbishmentController.getEligibleCenters(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].message).toBe('Limit must be between 1 and 100');
      expect(RefurbishmentService.getEligibleCenters).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if offset is negative', async () => {
      // Arrange
      req.query = { offset: '-5' };

      // Act
      await RefurbishmentController.getEligibleCenters(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].message).toBe('Offset must be non-negative');
      expect(RefurbishmentService.getEligibleCenters).not.toHaveBeenCalled();
    });

    it('should call next with error if service throws', async () => {
      // Arrange
      const serviceError = new Error('Database connection failed');
      RefurbishmentService.getEligibleCenters.mockRejectedValue(serviceError);

      // Act
      await RefurbishmentController.getEligibleCenters(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(serviceError);
      expect(ApiResponse.success).not.toHaveBeenCalled();
    });
  });

  describe('getAllCentersWithStatus()', () => {
    it('should return all centers with default pagination', async () => {
      // Arrange
      const mockServiceResponse = {
        centers: [
          { id: 'c1', center_name: 'Center 1', is_eligible: 1 },
          { id: 'c2', center_name: 'Center 2', is_eligible: 0 },
        ],
        totalCount: 2,
        eligibleCount: 1,
        ineligibleCount: 1,
      };
      RefurbishmentService.getAllCentersWithStatus.mockResolvedValue(mockServiceResponse);

      // Act
      await RefurbishmentController.getAllCentersWithStatus(req, res, next);

      // Assert
      expect(RefurbishmentService.getAllCentersWithStatus).toHaveBeenCalledWith(50, 0);
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          totalCount: 2,
          eligibleCount: 1,
          ineligibleCount: 1,
          pagination: { limit: 50, offset: 0, hasMore: false },
        }),
        'All centers retrieved successfully'
      );
    });

    it('should validate pagination parameters', async () => {
      // Arrange
      req.query = { limit: '200' }; // invalid - exceeds maximum of 100

      // Act
      await RefurbishmentController.getAllCentersWithStatus(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      const errorArg = next.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(ValidationError);
      expect(errorArg.message).toBe('Limit must be between 1 and 100');
      expect(RefurbishmentService.getAllCentersWithStatus).not.toHaveBeenCalled();
    });
  });

  describe('getRecentlyRefurbishedCenters()', () => {
    it('should return recently refurbished centers with default parameters', async () => {
      // Arrange
      const mockServiceResponse = {
        centers: [{ id: 'c1', center_name: 'Center 1', last_refurbishment_date: '2025-01-15' }],
        totalCount: 1,
        withinMonths: 12,
      };
      RefurbishmentService.getRecentlyRefurbishedCenters.mockResolvedValue(mockServiceResponse);

      // Act
      await RefurbishmentController.getRecentlyRefurbishedCenters(req, res, next);

      // Assert
      expect(RefurbishmentService.getRecentlyRefurbishedCenters).toHaveBeenCalledWith(12, 50, 0);
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          centers: mockServiceResponse.centers,
          totalCount: 1,
          withinMonths: 12,
          pagination: { limit: 50, offset: 0, hasMore: false },
        }),
        'Recently refurbished centers (within 12 months) retrieved successfully'
      );
    });

    it('should accept custom within parameter', async () => {
      // Arrange
      req.query = { within: '6', limit: '20' };
      const mockServiceResponse = {
        centers: [],
        totalCount: 0,
        withinMonths: 6,
      };
      RefurbishmentService.getRecentlyRefurbishedCenters.mockResolvedValue(mockServiceResponse);

      // Act
      await RefurbishmentController.getRecentlyRefurbishedCenters(req, res, next);

      // Assert
      expect(RefurbishmentService.getRecentlyRefurbishedCenters).toHaveBeenCalledWith(6, 20, 0);
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ withinMonths: 6 }),
        'Recently refurbished centers (within 6 months) retrieved successfully'
      );
    });

    it('should throw ValidationError if within months is out of range', async () => {
      // Arrange
      req.query = { within: '150' }; // exceeds max 120

      // Act
      await RefurbishmentController.getRecentlyRefurbishedCenters(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].message).toBe('Within months must be between 1 and 120 (10 years)');
    });

    it('should throw ValidationError if limit is invalid', async () => {
      // Arrange
      req.query = { limit: '150' };

      // Act
      await RefurbishmentController.getRecentlyRefurbishedCenters(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].message).toBe('Limit must be between 1 and 100');
    });
  });

  describe('checkCenterEligibility()', () => {
    it('should return center eligibility details', async () => {
      // Arrange
      const centerId = '12345678-1234-1234-1234-123456789012';
      req.params = { centerId };
      const mockCenter = {
        id: centerId,
        center_name: 'Test Center',
        is_eligible: 1,
        months_since_last_refurbishment: 36,
      };
      RefurbishmentService.checkCenterEligibility.mockResolvedValue(mockCenter);

      // Act
      await RefurbishmentController.checkCenterEligibility(req, res, next);

      // Assert
      expect(RefurbishmentService.checkCenterEligibility).toHaveBeenCalledWith(centerId);
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        { center: mockCenter },
        'Center eligibility checked successfully'
      );
    });

    it('should return 404 if center not found', async () => {
      // Arrange
      const centerId = '12345678-1234-1234-1234-123456789012';
      req.params = { centerId };
      RefurbishmentService.checkCenterEligibility.mockResolvedValue(null);

      // Act
      await RefurbishmentController.checkCenterEligibility(req, res, next);

      // Assert
      expect(ApiResponse.notFound).toHaveBeenCalledWith(res, 'Center not found');
      expect(ApiResponse.success).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if centerId is not a valid UUID', async () => {
      // Arrange
      req.params = { centerId: 'invalid-uuid' };

      // Act
      await RefurbishmentController.checkCenterEligibility(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].message).toContain('Invalid center ID format');
      expect(RefurbishmentService.checkCenterEligibility).not.toHaveBeenCalled();
    });

    it('should call next with error if service throws', async () => {
      // Arrange
      const centerId = '12345678-1234-1234-1234-123456789012';
      req.params = { centerId };
      const serviceError = new Error('Database error');
      RefurbishmentService.checkCenterEligibility.mockRejectedValue(serviceError);

      // Act
      await RefurbishmentController.checkCenterEligibility(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('getDashboardSummary()', () => {
    it('should return aggregated dashboard data with default parameters', async () => {
      // Arrange
      const mockEligible = {
        centers: [{ id: 'e1', center_name: 'Eligible 1' }],
        totalCount: 15,
      };
      const mockRecent = {
        centers: [{ id: 'r1', center_name: 'Recent 1' }],
        totalCount: 5,
        withinMonths: 12,
      };
      const mockAll = {
        centers: [{ id: 'a1', center_name: 'All 1' }],
        totalCount: 50,
        eligibleCount: 15,
        ineligibleCount: 35,
      };

      RefurbishmentService.getEligibleCenters.mockResolvedValue(mockEligible);
      RefurbishmentService.getRecentlyRefurbishedCenters.mockResolvedValue(mockRecent);
      RefurbishmentService.getAllCentersWithStatus.mockResolvedValue(mockAll);

      // Act
      await RefurbishmentController.getDashboardSummary(req, res, next);

      // Assert
      expect(RefurbishmentService.getEligibleCenters).toHaveBeenCalledWith(10, 0);
      expect(RefurbishmentService.getRecentlyRefurbishedCenters).toHaveBeenCalledWith(12, 10, 0);
      expect(RefurbishmentService.getAllCentersWithStatus).toHaveBeenCalledWith(10, 0);
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        {
          eligibleCenters: {
            centers: mockEligible.centers,
            totalCount: 15,
          },
          recentlyRefurbished: {
            centers: mockRecent.centers,
            totalCount: 5,
            withinMonths: 12,
          },
          allCentersSummary: {
            totalCount: 50,
            eligibleCount: 15,
            ineligibleCount: 35,
          },
        },
        'Dashboard summary retrieved successfully'
      );
    });

    it('should accept custom recentlyRefurbishedWithin parameter', async () => {
      // Arrange
      req.query = { recentlyRefurbishedWithin: '6' };
      RefurbishmentService.getEligibleCenters.mockResolvedValue({ centers: [], totalCount: 0 });
      RefurbishmentService.getRecentlyRefurbishedCenters.mockResolvedValue({ centers: [], totalCount: 0, withinMonths: 6 });
      RefurbishmentService.getAllCentersWithStatus.mockResolvedValue({ centers: [], totalCount: 0, eligibleCount: 0, ineligibleCount: 0 });

      // Act
      await RefurbishmentController.getDashboardSummary(req, res, next);

      // Assert
      expect(RefurbishmentService.getRecentlyRefurbishedCenters).toHaveBeenCalledWith(6, 10, 0);
    });

    it('should throw ValidationError if recentlyRefurbishedWithin is out of range', async () => {
      // Arrange
      req.query = { recentlyRefurbishedWithin: '200' };

      // Act
      await RefurbishmentController.getDashboardSummary(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(next.mock.calls[0][0].message).toBe('Within months must be between 1 and 120 (10 years)');
    });

    it('should call next with error if any service call fails', async () => {
      // Arrange
      const serviceError = new Error('Service failed');
      RefurbishmentService.getEligibleCenters.mockRejectedValue(serviceError);

      // Act
      await RefurbishmentController.getDashboardSummary(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(serviceError);
      expect(ApiResponse.success).not.toHaveBeenCalled();
    });
  });
});
