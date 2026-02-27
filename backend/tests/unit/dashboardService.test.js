const DashboardService = require('../../src/api/v1/services/dashboard.service');
const db = require('../../src/database/connection');

jest.mock('../../src/database/connection');

describe('DashboardService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPartnerDashboard', () => {
    it('should return partner dashboard statistics', async () => {
      const mockPartnerId = 'partner-123';

      // Mock all database queries for partner dashboard
      db.query
        .mockResolvedValueOnce([[{ total: 5 }]]) // totalCenters
        .mockResolvedValueOnce([[{ total: 10 }]]) // totalBatches
        .mockResolvedValueOnce([[{ total: 150 }]]) // totalStudents
        .mockResolvedValueOnce([[{ total: 2 }]]) // pendingUploads
        .mockResolvedValueOnce([[{ total: 8 }]]) // approvedUploads
        .mockResolvedValueOnce([[{ total: 1 }]]) // rejectedUploads
        .mockResolvedValueOnce([[{ total: 3 }]]) // activeRequests
        .mockResolvedValueOnce([
          [
            // recentUploads
            {
              id: 'upload-1',
              file_name: 'test.csv',
              status: 'approved',
              created_at: new Date(),
              total_records: 50,
            },
          ],
        ])
        .mockResolvedValueOnce([[{ total: 2 }]]); // refurbishmentEligibleCenters

      const result = await DashboardService.getPartnerDashboard(mockPartnerId);

      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('recentUploads');
      expect(result.statistics.totalCenters).toBe(5);
      expect(result.statistics.totalBatches).toBe(10);
      expect(result.statistics.totalStudents).toBe(150);
      expect(result.statistics.pendingUploads).toBe(2);
      expect(result.statistics.approvedUploads).toBe(8);
      expect(result.statistics.rejectedUploads).toBe(1);
      expect(result.statistics.activeRequests).toBe(3);
      expect(result.statistics.refurbishmentEligibleCenters).toBe(2);
      expect(result.recentUploads).toHaveLength(1);
      expect(result.recentUploads[0].file_name).toBe('test.csv');
      expect(db.query).toHaveBeenCalledTimes(9);
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(DashboardService.getPartnerDashboard('partner-123')).rejects.toThrow(
        'Failed to fetch partner dashboard data'
      );
    });

    it('should query with correct partner_id', async () => {
      const mockPartnerId = 'partner-456';

      db.query
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ total: 0 }]]);

      await DashboardService.getPartnerDashboard(mockPartnerId);

      // Verify first query uses correct partner_id
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE partner_id = ?'),
        expect.arrayContaining([mockPartnerId])
      );
    });
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard statistics', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 25 }]]) // totalPartners
        .mockResolvedValueOnce([[{ total: 100 }]]) // totalCenters
        .mockResolvedValueOnce([[{ total: 200 }]]) // totalBatches
        .mockResolvedValueOnce([[{ total: 5000 }]]) // totalStudents
        .mockResolvedValueOnce([[{ total: 5 }]]) // pendingUploads
        .mockResolvedValueOnce([[{ total: 10 }]]) // pendingRequests
        .mockResolvedValueOnce([[{ total: 15 }]]) // refurbishmentEligibleCenters
        .mockResolvedValueOnce([
          [
            // recentUploads
            { id: 'upload-1', file_name: 'test.csv', status: 'pending', partner_name: 'Partner A' },
          ],
        ])
        .mockResolvedValueOnce([
          [
            // centersByRegion
            { region: 'North', count: 30 },
            { region: 'South', count: 40 },
          ],
        ])
        .mockResolvedValueOnce([
          [
            // centersByState
            { state: 'Maharashtra', count: 25 },
          ],
        ]);

      const result = await DashboardService.getAdminDashboard();

      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('recentUploads');
      expect(result).toHaveProperty('centersByRegion');
      expect(result).toHaveProperty('centersByState');
      expect(result.statistics.totalPartners).toBe(25);
      expect(result.statistics.totalCenters).toBe(100);
      expect(result.statistics.totalBatches).toBe(200);
      expect(result.statistics.totalStudents).toBe(5000);
      expect(result.statistics.pendingUploads).toBe(5);
      expect(result.statistics.pendingRequests).toBe(10);
      expect(result.statistics.refurbishmentEligibleCenters).toBe(15);
      expect(result.centersByRegion).toHaveLength(2);
      expect(result.centersByState).toHaveLength(1);
      expect(db.query).toHaveBeenCalledTimes(10);
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(DashboardService.getAdminDashboard()).rejects.toThrow(
        'Failed to fetch admin dashboard data'
      );
    });

    it('should include partner names in recent uploads', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([
          [
            // recentUploads
            { id: 'upload-1', partner_name: 'Test Partner' },
          ],
        ])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await DashboardService.getAdminDashboard();

      expect(result.recentUploads[0].partner_name).toBe('Test Partner');
    });
  });

  describe('getSEIFDashboard', () => {
    it('should return SEIF dashboard statistics without filters', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 100 }]]) // totalCenters
        .mockResolvedValueOnce([[{ total: 25 }]]) // totalPartners
        .mockResolvedValueOnce([[{ total: 200 }]]) // totalBatches
        .mockResolvedValueOnce([[{ total: 5000 }]]) // totalStudents
        .mockResolvedValueOnce([
          [
            // centersByRegion
            { region: 'North', count: 30 },
          ],
        ])
        .mockResolvedValueOnce([
          [
            // centersByState
            { state: 'Maharashtra', count: 25 },
          ],
        ])
        .mockResolvedValueOnce([
          [
            // centersByType
            { center_type: 'Short Term', count: 50 },
          ],
        ])
        .mockResolvedValueOnce([[{ male: 3000, female: 2000 }]]) // genderDistribution
        .mockResolvedValueOnce([
          [
            // batchesByYear
            { year: 2025, count: 50 },
          ],
        ]);

      const result = await DashboardService.getSEIFDashboard();

      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('centersByRegion');
      expect(result).toHaveProperty('centersByState');
      expect(result).toHaveProperty('centersByType');
      expect(result).toHaveProperty('batchesByYear');
      expect(result).toHaveProperty('filters');
      expect(result.statistics.totalCenters).toBe(100);
      expect(result.statistics.totalPartners).toBe(25);
      expect(result.statistics.totalBatches).toBe(200);
      expect(result.statistics.totalStudents).toBe(5000);
      expect(result.statistics.maleStudents).toBe(3000);
      expect(result.statistics.femaleStudents).toBe(2000);
      expect(result.filters.state).toBeNull();
      expect(result.filters.region).toBeNull();
      expect(result.filters.year).toBeNull();
      expect(db.query).toHaveBeenCalledTimes(9);
    });

    it('should apply state filter', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 25 }]])
        .mockResolvedValueOnce([[{ total: 10 }]])
        .mockResolvedValueOnce([[{ total: 50 }]])
        .mockResolvedValueOnce([[{ total: 1000 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ male: 600, female: 400 }]])
        .mockResolvedValueOnce([[]]);

      const filters = { state: 'Maharashtra' };
      const result = await DashboardService.getSEIFDashboard(filters);

      expect(result.filters.state).toBe('Maharashtra');
      // Verify query includes state filter
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('c.state = ?'),
        expect.arrayContaining(['active', 'Maharashtra'])
      );
    });

    it('should apply region filter', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 30 }]])
        .mockResolvedValueOnce([[{ total: 10 }]])
        .mockResolvedValueOnce([[{ total: 60 }]])
        .mockResolvedValueOnce([[{ total: 1200 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ male: 700, female: 500 }]])
        .mockResolvedValueOnce([[]]);

      const filters = { region: 'West' };
      const result = await DashboardService.getSEIFDashboard(filters);

      expect(result.filters.region).toBe('West');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('c.region = ?'),
        expect.arrayContaining(['active', 'West'])
      );
    });

    it('should apply year filter', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 100 }]])
        .mockResolvedValueOnce([[{ total: 25 }]])
        .mockResolvedValueOnce([[{ total: 50 }]])
        .mockResolvedValueOnce([[{ total: 1000 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ male: 600, female: 400 }]])
        .mockResolvedValueOnce([[]]);

      const filters = { year: 2024 };
      const result = await DashboardService.getSEIFDashboard(filters);

      expect(result.filters.year).toBe(2024);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('YEAR(b.batch_start_date) = ?'),
        expect.arrayContaining([2024])
      );
    });

    it('should apply multiple filters together', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 20 }]])
        .mockResolvedValueOnce([[{ total: 5 }]])
        .mockResolvedValueOnce([[{ total: 30 }]])
        .mockResolvedValueOnce([[{ total: 500 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ male: 300, female: 200 }]])
        .mockResolvedValueOnce([[]]);

      const filters = { state: 'Karnataka', region: 'South', year: 2024 };
      const result = await DashboardService.getSEIFDashboard(filters);

      expect(result.filters.state).toBe('Karnataka');
      expect(result.filters.region).toBe('South');
      expect(result.filters.year).toBe(2024);
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(DashboardService.getSEIFDashboard()).rejects.toThrow(
        'Failed to fetch SEIF dashboard data'
      );
    });

    it('should handle null gender distribution gracefully', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 10 }]])
        .mockResolvedValueOnce([[{ total: 5 }]])
        .mockResolvedValueOnce([[{ total: 20 }]])
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]) // Empty gender distribution
        .mockResolvedValueOnce([[]]);

      const result = await DashboardService.getSEIFDashboard();

      expect(result.statistics.maleStudents).toBe(0);
      expect(result.statistics.femaleStudents).toBe(0);
    });
  });
});
