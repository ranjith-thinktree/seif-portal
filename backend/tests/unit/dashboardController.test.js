const DashboardController = require('../../src/api/v1/controllers/dashboard.controller');
const DashboardService = require('../../src/api/v1/services/dashboard.service');
const ApiResponse = require('../../src/utils/response.util');

jest.mock('../../src/api/v1/services/dashboard.service');
jest.mock('../../src/utils/response.util');

describe('DashboardController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getPartnerDashboard', () => {
    it('should return partner dashboard successfully', async () => {
      const mockData = {
        statistics: {
          totalCenters: 5,
          totalBatches: 10,
          totalStudents: 150,
        },
        recentUploads: [],
      };

      req.user.partner_id = 'partner-123';
      DashboardService.getPartnerDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation((res, data) => {
        res.json({ success: true, data });
      });

      await DashboardController.getPartnerDashboard(req, res, next);

      expect(DashboardService.getPartnerDashboard).toHaveBeenCalledWith('partner-123');
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        mockData,
        'Partner dashboard data retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if partner_id is missing', async () => {
      req.user.partner_id = null;
      ApiResponse.error.mockImplementation((res, message, code) => {
        res.status(code).json({ success: false, message });
      });

      await DashboardController.getPartnerDashboard(req, res, next);

      expect(ApiResponse.error).toHaveBeenCalledWith(
        res,
        'Partner ID not found in user profile',
        400
      );
      expect(DashboardService.getPartnerDashboard).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      req.user.partner_id = 'partner-123';
      DashboardService.getPartnerDashboard.mockRejectedValue(error);

      await DashboardController.getPartnerDashboard(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(ApiResponse.success).not.toHaveBeenCalled();
    });

    it('should pass correct partner_id to service', async () => {
      const mockData = { statistics: {}, recentUploads: [] };
      req.user.partner_id = 'partner-456';
      DashboardService.getPartnerDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation(() => {});

      await DashboardController.getPartnerDashboard(req, res, next);

      expect(DashboardService.getPartnerDashboard).toHaveBeenCalledWith('partner-456');
    });
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard successfully', async () => {
      const mockData = {
        statistics: {
          totalPartners: 25,
          totalCenters: 100,
          totalBatches: 200,
          totalStudents: 5000,
        },
        recentUploads: [],
        centersByRegion: [],
        centersByState: [],
      };

      DashboardService.getAdminDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation((res, data) => {
        res.json({ success: true, data });
      });

      await DashboardController.getAdminDashboard(req, res, next);

      expect(DashboardService.getAdminDashboard).toHaveBeenCalled();
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        mockData,
        'Admin dashboard data retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      DashboardService.getAdminDashboard.mockRejectedValue(error);

      await DashboardController.getAdminDashboard(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(ApiResponse.success).not.toHaveBeenCalled();
    });

    it('should call service with no parameters', async () => {
      const mockData = { statistics: {} };
      DashboardService.getAdminDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation(() => {});

      await DashboardController.getAdminDashboard(req, res, next);

      expect(DashboardService.getAdminDashboard).toHaveBeenCalledWith();
    });
  });

  describe('getSEIFDashboard', () => {
    it('should return SEIF dashboard without filters', async () => {
      const mockData = {
        statistics: { totalCenters: 100 },
        centersByRegion: [],
        centersByState: [],
        centersByType: [],
        batchesByYear: [],
        filters: { state: null, region: null, year: null },
      };

      req.query = {};
      DashboardService.getSEIFDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation((res, data) => {
        res.json({ success: true, data });
      });

      await DashboardController.getSEIFDashboard(req, res, next);

      expect(DashboardService.getSEIFDashboard).toHaveBeenCalledWith({});
      expect(ApiResponse.success).toHaveBeenCalledWith(
        res,
        mockData,
        'SEIF dashboard data retrieved successfully'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should apply state filter', async () => {
      const mockData = {
        statistics: {},
        filters: { state: 'Maharashtra', region: null, year: null },
      };

      req.query = { state: 'Maharashtra' };
      DashboardService.getSEIFDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation(() => {});

      await DashboardController.getSEIFDashboard(req, res, next);

      expect(DashboardService.getSEIFDashboard).toHaveBeenCalledWith({
        state: 'Maharashtra',
      });
    });

    it('should apply region filter', async () => {
      const mockData = { statistics: {}, filters: { region: 'West' } };

      req.query = { region: 'West' };
      DashboardService.getSEIFDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation(() => {});

      await DashboardController.getSEIFDashboard(req, res, next);

      expect(DashboardService.getSEIFDashboard).toHaveBeenCalledWith({
        region: 'West',
      });
    });

    it('should apply year filter and convert to integer', async () => {
      const mockData = { statistics: {}, filters: { year: 2024 } };

      req.query = { year: '2024' };
      DashboardService.getSEIFDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation(() => {});

      await DashboardController.getSEIFDashboard(req, res, next);

      expect(DashboardService.getSEIFDashboard).toHaveBeenCalledWith({
        year: 2024,
      });
    });

    it('should apply multiple filters', async () => {
      const mockData = {
        statistics: {},
        filters: { state: 'Karnataka', region: 'South', year: 2024 },
      };

      req.query = { state: 'Karnataka', region: 'South', year: '2024' };
      DashboardService.getSEIFDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation(() => {});

      await DashboardController.getSEIFDashboard(req, res, next);

      expect(DashboardService.getSEIFDashboard).toHaveBeenCalledWith({
        state: 'Karnataka',
        region: 'South',
        year: 2024,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      req.query = {};
      DashboardService.getSEIFDashboard.mockRejectedValue(error);

      await DashboardController.getSEIFDashboard(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(ApiResponse.success).not.toHaveBeenCalled();
    });

    it('should ignore invalid filter parameters', async () => {
      const mockData = { statistics: {}, filters: {} };

      req.query = { state: 'Maharashtra', invalidParam: 'test' };
      DashboardService.getSEIFDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation(() => {});

      await DashboardController.getSEIFDashboard(req, res, next);

      // Should only pass valid filters (state), not invalidParam
      expect(DashboardService.getSEIFDashboard).toHaveBeenCalledWith({
        state: 'Maharashtra',
      });
    });

    it('should handle NaN year conversion', async () => {
      const mockData = { statistics: {}, filters: {} };

      req.query = { year: 'invalid-year' };
      DashboardService.getSEIFDashboard.mockResolvedValue(mockData);
      ApiResponse.success.mockImplementation(() => {});

      await DashboardController.getSEIFDashboard(req, res, next);

      // parseInt('invalid-year') returns NaN, which should be included
      expect(DashboardService.getSEIFDashboard).toHaveBeenCalledWith({
        year: expect.any(Number),
      });
    });
  });
});
