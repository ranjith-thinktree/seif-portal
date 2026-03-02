const RefurbishmentService = require('../src/api/v1/services/refurbishment.service');
const db = require('../src/database/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * Test Suite: Refurbishment Service - Eligibility Calculation
 *
 * Tests the time-based eligibility formula for refurbishment requests.
 * Eligibility is based on months since last refurbishment (or establishment for new centers)
 * compared to refurbishment_frequency_months.
 */
describe('RefurbishmentService - Eligibility Calculation', () => {
  // Sample partner for testing
  const testPartnerId = uuidv4();
  const testPartnerName = 'Test Partner Organization';

  // Sample center IDs
  const centerIds = {
    eligibleWithRefurb: uuidv4(),
    eligibleNewCenter: uuidv4(),
    ineligibleRecent: uuidv4(),
    ineligibleNew: uuidv4(),
    inactive: uuidv4(),
  };

  beforeAll(async () => {
    // Clean up any stale data from previous failed test runs to avoid duplicate-key errors
    // (The DB may auto-generate center_id values like 'TES-001' based on partner name,
    //  so we must remove any left-over rows with this partner name before inserting fresh ones.)
    try {
      await db.query(
        `DELETE FROM refurbishment_requests
         WHERE center_id IN (SELECT id FROM centers WHERE center_id LIKE ?)`,
        ['JEST-%']
      );
    } catch (_) {
      /* ignore if table doesn't exist or no rows */
    }
    await db.query('DELETE FROM centers WHERE center_id LIKE ?', ['JEST-%']);
    await db.query(
      'DELETE FROM centers WHERE partner_id IN (SELECT id FROM partners WHERE name = ?)',
      [testPartnerName]
    );
    await db.query('DELETE FROM partners WHERE name = ?', [testPartnerName]);

    // Create test partner
    await db.query(
      'INSERT INTO partners (id, name, contact_person, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?)',
      [testPartnerId, testPartnerName, 'Test Contact', 'test@example.com', '1234567890']
    );

    // Calculate dates for test scenarios
    const threeYearsAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 3))
      .toISOString()
      .split('T')[0];
    const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
      .toISOString()
      .split('T')[0];
    const fourYearsAgoYear = new Date().getFullYear() - 4;
    const oneYearAgoYear = new Date().getFullYear() - 1;

    // Create test centers with different eligibility scenarios
    const centers = [
      {
        id: centerIds.eligibleWithRefurb,
        center_id: 'JEST-REF-001',
        center_name: 'Eligible Center (Last Refurbished 3 Years Ago)',
        partner_id: testPartnerId,
        year_of_establishment: 2020,
        last_refurbishment_date: threeYearsAgo,
        refurbishment_frequency_months: 24, // 24 months = 2 years
        status: 'active',
        city: 'Test City',
        state: 'Test State',
        region: 'N',
        center_type: 'Short term',
      },
      {
        id: centerIds.eligibleNewCenter,
        center_id: 'JEST-REF-002',
        center_name: 'Eligible New Center (Never Refurbished, 4 Years Old)',
        partner_id: testPartnerId,
        year_of_establishment: fourYearsAgoYear,
        last_refurbishment_date: null,
        refurbishment_frequency_months: 36, // 36 months = 3 years
        status: 'active',
        city: 'Test City',
        state: 'Test State',
        region: 'S',
        center_type: 'Short term',
      },
      {
        id: centerIds.ineligibleRecent,
        center_id: 'JEST-REF-003',
        center_name: 'Ineligible Center (Recently Refurbished 1 Year Ago)',
        partner_id: testPartnerId,
        year_of_establishment: 2019,
        last_refurbishment_date: oneYearAgo,
        refurbishment_frequency_months: 24,
        status: 'active',
        city: 'Test City',
        state: 'Test State',
        region: 'E',
        center_type: 'Short term',
      },
      {
        id: centerIds.ineligibleNew,
        center_id: 'JEST-REF-004',
        center_name: 'Ineligible New Center (Only 1 Year Old)',
        partner_id: testPartnerId,
        year_of_establishment: oneYearAgoYear,
        last_refurbishment_date: null,
        refurbishment_frequency_months: 24,
        status: 'active',
        city: 'Test City',
        state: 'Test State',
        region: 'W',
        center_type: 'Short term',
      },
      {
        id: centerIds.inactive,
        center_id: 'JEST-REF-005',
        center_name: 'Inactive Center (Should Not Appear)',
        partner_id: testPartnerId,
        year_of_establishment: 2018,
        last_refurbishment_date: threeYearsAgo,
        refurbishment_frequency_months: 24,
        status: 'inactive',
        city: 'Test City',
        state: 'Test State',
        region: 'C',
        center_type: 'Short term',
      },
    ];

    // Insert test centers
    for (const center of centers) {
      await db.query(
        `INSERT INTO centers (
          id, center_id, center_name, partner_id, year_of_establishment, 
          last_refurbishment_date, refurbishment_frequency_months, 
          city, state, region, center_type, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          center.id,
          center.center_id,
          center.center_name,
          center.partner_id,
          center.year_of_establishment,
          center.last_refurbishment_date,
          center.refurbishment_frequency_months,
          center.city,
          center.state,
          center.region,
          center.center_type,
          center.status,
        ]
      );
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db.query(
        'DELETE FROM refurbishment_requests WHERE center_id IN (SELECT id FROM centers WHERE center_id LIKE ?)',
        ['JEST-%']
      );
    } catch (_) {
      /* ignore */
    }
    await db.query('DELETE FROM centers WHERE center_id LIKE ?', ['JEST-%']);
    await db.query('DELETE FROM centers WHERE partner_id = ?', [testPartnerId]);
    await db.query('DELETE FROM partners WHERE id = ?', [testPartnerId]);
  });

  describe('getEligibleCenters()', () => {
    it('should return only eligible centers (excluding inactive)', async () => {
      const result = await RefurbishmentService.getEligibleCenters(1000);

      expect(result).toHaveProperty('centers');
      expect(result).toHaveProperty('totalCount');
      expect(Array.isArray(result.centers)).toBe(true);

      // Should have exactly 2 eligible centers (not the inactive one)
      const testCenters = result.centers.filter((c) => c.partner_id === testPartnerId);
      expect(testCenters.length).toBe(2);

      // Verify both eligible centers are present
      const centerIds_found = testCenters.map((c) => c.id);
      expect(centerIds_found).toContain(centerIds.eligibleWithRefurb);
      expect(centerIds_found).toContain(centerIds.eligibleNewCenter);

      // Verify ineligible centers are NOT present
      expect(centerIds_found).not.toContain(centerIds.ineligibleRecent);
      expect(centerIds_found).not.toContain(centerIds.ineligibleNew);
      expect(centerIds_found).not.toContain(centerIds.inactive);
    });

    it('should return centers with correct eligibility flag', async () => {
      const result = await RefurbishmentService.getEligibleCenters(1000);

      const testCenters = result.centers.filter((c) => c.partner_id === testPartnerId);

      testCenters.forEach((center) => {
        expect(center.is_eligible).toBe(1);
      });
    });

    it('should calculate months_since_last_refurbishment correctly for existing refurbishment', async () => {
      const result = await RefurbishmentService.getEligibleCenters(1000);

      const centerWithRefurb = result.centers.find((c) => c.id === centerIds.eligibleWithRefurb);
      expect(centerWithRefurb).toBeDefined();

      // Should be approximately 36 months (3 years) since last refurbishment
      expect(centerWithRefurb.months_since_last_refurbishment).toBeGreaterThanOrEqual(35);
      expect(centerWithRefurb.months_since_last_refurbishment).toBeLessThanOrEqual(37);
    });

    it('should calculate months_since_last_refurbishment correctly for new centers', async () => {
      const result = await RefurbishmentService.getEligibleCenters(1000);

      const newCenter = result.centers.find((c) => c.id === centerIds.eligibleNewCenter);
      expect(newCenter).toBeDefined();

      // Should be approximately 48 months (4 years) since establishment
      expect(newCenter.months_since_last_refurbishment).toBeGreaterThanOrEqual(47);
      expect(newCenter.months_since_last_refurbishment).toBeLessThanOrEqual(49);
    });

    it('should return centers sorted by months_since_last_refurbishment DESC', async () => {
      const result = await RefurbishmentService.getEligibleCenters(1000);

      const testCenters = result.centers.filter((c) => c.partner_id === testPartnerId);

      if (testCenters.length > 1) {
        for (let i = 0; i < testCenters.length - 1; i++) {
          expect(testCenters[i].months_since_last_refurbishment).toBeGreaterThanOrEqual(
            testCenters[i + 1].months_since_last_refurbishment
          );
        }
      }
    });

    it('should include partner_name from partners table', async () => {
      const result = await RefurbishmentService.getEligibleCenters(1000);

      const testCenters = result.centers.filter((c) => c.partner_id === testPartnerId);

      testCenters.forEach((center) => {
        expect(center).toHaveProperty('partner_name');
        expect(center.partner_name).toBe(testPartnerName);
      });
    });
  });

  describe('getAllCentersWithStatus()', () => {
    it('should return all active centers with eligibility status', async () => {
      const result = await RefurbishmentService.getAllCentersWithStatus();

      expect(result).toHaveProperty('centers');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('eligibleCount');
      expect(result).toHaveProperty('ineligibleCount');

      const testCenters = result.centers.filter((c) => c.partner_id === testPartnerId);

      // Should have 4 active centers (not the inactive one)
      expect(testCenters.length).toBe(4);

      // Should not include inactive center
      const centerIds_found = testCenters.map((c) => c.id);
      expect(centerIds_found).not.toContain(centerIds.inactive);
    });

    it('should not include inactive centers', async () => {
      const result = await RefurbishmentService.getAllCentersWithStatus();

      const inactiveCenter = result.centers.find((c) => c.id === centerIds.inactive);
      expect(inactiveCenter).toBeUndefined();
    });

    it('should sort centers by eligibility DESC, then months DESC', async () => {
      const result = await RefurbishmentService.getAllCentersWithStatus();

      const testCenters = result.centers.filter((c) => c.partner_id === testPartnerId);

      // First centers should be eligible (is_eligible = 1)
      // Then ineligible (is_eligible = 0)
      let foundIneligible = false;
      for (const center of testCenters) {
        if (center.is_eligible === 0) {
          foundIneligible = true;
        } else if (foundIneligible) {
          fail('Eligible centers should appear before ineligible centers');
        }
      }
    });
  });

  describe('getRecentlyRefurbishedCenters()', () => {
    it('should return centers refurbished within specified months', async () => {
      const result = await RefurbishmentService.getRecentlyRefurbishedCenters(24);

      expect(result).toHaveProperty('centers');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('withinMonths');
      expect(result.withinMonths).toBe(24);

      const testCenters = result.centers.filter((c) => c.partner_id === testPartnerId);

      // Should include the center refurbished 1 year ago (within 24 months)
      const centerIds_found = testCenters.map((c) => c.id);
      expect(centerIds_found).toContain(centerIds.ineligibleRecent);

      // Should NOT include centers refurbished 3 years ago (outside 24 months)
      expect(centerIds_found).not.toContain(centerIds.eligibleWithRefurb);
    });

    it('should return empty array if no centers refurbished within timeframe', async () => {
      const result = await RefurbishmentService.getRecentlyRefurbishedCenters(1);

      const testCenters = result.centers.filter((c) => c.partner_id === testPartnerId);

      // Within 1 month, none of our test centers should appear
      expect(testCenters.length).toBe(0);
    });

    it('should sort by last_refurbishment_date DESC', async () => {
      const result = await RefurbishmentService.getRecentlyRefurbishedCenters(48);

      const testCenters = result.centers.filter((c) => c.partner_id === testPartnerId);

      if (testCenters.length > 1) {
        for (let i = 0; i < testCenters.length - 1; i++) {
          const currentDate = new Date(testCenters[i].last_refurbishment_date);
          const nextDate = new Date(testCenters[i + 1].last_refurbishment_date);
          expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
        }
      }
    });
  });

  describe('checkCenterEligibility()', () => {
    it('should return eligibility details for a specific center', async () => {
      const result = await RefurbishmentService.checkCenterEligibility(
        centerIds.eligibleWithRefurb
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(centerIds.eligibleWithRefurb);
      expect(result.is_eligible).toBe(1);
      expect(result).toHaveProperty('months_since_last_refurbishment');
      expect(result).toHaveProperty('partner_name');
      expect(result.partner_name).toBe(testPartnerName);
    });

    it('should return null for non-existent center', async () => {
      const result = await RefurbishmentService.checkCenterEligibility(uuidv4());

      expect(result).toBeNull();
    });

    it('should correctly calculate eligibility for ineligible center', async () => {
      const result = await RefurbishmentService.checkCenterEligibility(centerIds.ineligibleRecent);

      expect(result).toBeDefined();
      expect(result.id).toBe(centerIds.ineligibleRecent);
      expect(result.is_eligible).toBe(0);
    });

    it('should work for inactive centers', async () => {
      const result = await RefurbishmentService.checkCenterEligibility(centerIds.inactive);

      expect(result).toBeDefined();
      expect(result.id).toBe(centerIds.inactive);
      expect(result.status).toBe('inactive');
      expect(result).toHaveProperty('is_eligible');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null refurbishment_frequency_months gracefully', async () => {
      const testCenterId = uuidv4();

      await db.query(
        `INSERT INTO centers (
          id, center_id, center_name, partner_id, year_of_establishment, 
          last_refurbishment_date, refurbishment_frequency_months, 
          city, state, region, center_type, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testCenterId,
          'JEST-EDGE-001',
          'Center with null frequency',
          testPartnerId,
          2020,
          null,
          null,
          'Test City',
          'Test State',
          'N',
          'Short term',
          'active',
        ]
      );

      try {
        const result = await RefurbishmentService.checkCenterEligibility(testCenterId);

        expect(result).toBeDefined();
        expect(result.id).toBe(testCenterId);
      } finally {
        await db.query('DELETE FROM centers WHERE id = ?', [testCenterId]);
      }
    });

    it('should handle year_of_establishment = current year', async () => {
      const testCenterId = uuidv4();
      const currentYear = new Date().getFullYear();

      await db.query(
        `INSERT INTO centers (
          id, center_id, center_name, partner_id, year_of_establishment, 
          last_refurbishment_date, refurbishment_frequency_months, 
          city, state, region, center_type, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testCenterId,
          'JEST-EDGE-002',
          'Brand New Center',
          testPartnerId,
          currentYear,
          null,
          24,
          'Test City',
          'Test State',
          'N',
          'Short term',
          'active',
        ]
      );

      try {
        const result = await RefurbishmentService.checkCenterEligibility(testCenterId);

        expect(result).toBeDefined();
        expect(result.id).toBe(testCenterId);
        // months_since_last_refurbishment is calculated from Jan 1 of the year,
        // so it may be 0-11 depending on when the test runs
        expect(result.months_since_last_refurbishment).toBeGreaterThanOrEqual(0);
        expect(result.months_since_last_refurbishment).toBeLessThan(12);
        expect(result.is_eligible).toBe(0);
      } finally {
        await db.query('DELETE FROM centers WHERE id = ?', [testCenterId]);
      }
    });
  });
});
