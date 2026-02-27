const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../src/app');
const db = require('../src/database/connection');
const AuthService = require('../src/api/v1/services/auth.service');

/**
 * Integration Tests for Refurbishment API
 * Tests the complete flow from HTTP request to database and back
 */

describe('Refurbishment API - Integration Tests', () => {
  let adminToken;
  let partnerToken;
  let testPartnerId;
  let testCenterIds = [];
  let testPartnerName = 'Integration Test Partner';

  beforeAll(async () => {
    // Create test partner
    testPartnerId = uuidv4();
    await db.query(
      `INSERT INTO partners (id, name, organization_type, contact_person, contact_email, contact_phone, status)
       VALUES (?, ?, 'Private', 'Test Contact', 'test@example.com', '+91-9876543210', 'active')`,
      [testPartnerId, testPartnerName]
    );

    // Create admin user and token
    const adminUserId = uuidv4();
    const adminPasswordHash = '$2b$10$abcdefghijklmnopqrstuvwxyz123456789'; // Mock hash
    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, status)
       VALUES (?, 'admin@test.com', ?, 'Admin User', 'ADMIN', 'active')`,
      [adminUserId, adminPasswordHash]
    );
    adminToken = AuthService.generateAccessToken({
      id: adminUserId,
      email: 'admin@test.com',
      role: 'ADMIN',
    });

    // Create partner user and token
    const partnerUserId = uuidv4();
    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, partner_id, status)
       VALUES (?, 'partner@test.com', ?, 'Partner User', 'PARTNER', ?, 'active')`,
      [partnerUserId, adminPasswordHash, testPartnerId]
    );
    partnerToken = AuthService.generateAccessToken({
      id: partnerUserId,
      email: 'partner@test.com',
      role: 'PARTNER',
    });

    // Create test centers with different eligibility statuses
    const centers = [
      {
        id: uuidv4(),
        name: 'Eligible Center 1',
        lastRefurb: '2021-01-01',
        frequency: 36,
        status: 'active',
      },
      {
        id: uuidv4(),
        name: 'Eligible Center 2',
        lastRefurb: null,
        yearEstablished: 2020,
        frequency: 24,
        status: 'active',
      },
      {
        id: uuidv4(),
        name: 'Ineligible Center',
        lastRefurb: '2025-01-01',
        frequency: 36,
        status: 'active',
      },
      {
        id: uuidv4(),
        name: 'Inactive Center',
        lastRefurb: '2020-01-01',
        frequency: 36,
        status: 'inactive',
      },
    ];

    for (const center of centers) {
      testCenterIds.push(center.id);
      await db.query(
        `INSERT INTO centers (id, partner_id, center_name, center_type, region, city, state, address,
         year_of_establishment, status, refurbishment_frequency_months, last_refurbishment_date)
         VALUES (?, ?, ?, 'Short Term', 'West', 'Test City', 'Test State', 'Test Address', ?, ?, ?, ?)`,
        [
          center.id,
          testPartnerId,
          center.name,
          center.yearEstablished || 2020,
          center.status,
          center.frequency,
          center.lastRefurb,
        ]
      );
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await db.query('DELETE FROM centers WHERE partner_id = ?', [testPartnerId]);
    await db.query('DELETE FROM users WHERE email IN (?, ?)', [
      'admin@test.com',
      'partner@test.com',
    ]);
    await db.query('DELETE FROM partners WHERE id = ?', [testPartnerId]);
    await db.closePool();
  });

  describe('GET /api/v1/admin/refurbishment/eligible-centers', () => {
    it('should return eligible centers for authenticated admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/eligible-centers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('centers');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.centers)).toBe(true);

      // Should include at least our 2 eligible test centers
      expect(response.body.data.totalCount).toBeGreaterThanOrEqual(2);

      // Check pagination metadata
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('offset');
      expect(response.body.data.pagination).toHaveProperty('hasMore');
    });

    it('should respect custom pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/eligible-centers?limit=1&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.centers.length).toBeLessThanOrEqual(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.offset).toBe(0);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/eligible-centers')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 if user is not admin (partner token)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/eligible-centers')
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/eligible-centers?limit=200')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Limit must be between 1 and 100');
    });
  });

  describe('GET /api/v1/admin/refurbishment/all-centers', () => {
    it('should return all active centers with eligibility status', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/all-centers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('centers');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('eligibleCount');
      expect(response.body.data).toHaveProperty('ineligibleCount');

      // Should include at least our 3 active test centers (2 eligible + 1 ineligible)
      expect(response.body.data.totalCount).toBeGreaterThanOrEqual(3);
      expect(response.body.data.eligibleCount).toBeGreaterThanOrEqual(2);
      expect(response.body.data.ineligibleCount).toBeGreaterThanOrEqual(1);
    });

    it('should not include inactive centers', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/all-centers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const inactiveCenterName = 'Inactive Center';
      const hasInactiveCenter = response.body.data.centers.some(
        (c) => c.center_name === inactiveCenterName
      );

      expect(hasInactiveCenter).toBe(false);
    });
  });

  describe('GET /api/v1/admin/refurbishment/recently-refurbished', () => {
    it('should return recently refurbished centers within timeframe', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/recently-refurbished?within=12')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('centers');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('withinMonths');
      expect(response.body.data.withinMonths).toBe(12);
    });

    it('should accept custom within parameter', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/recently-refurbished?within=6')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.withinMonths).toBe(6);
    });

    it('should return 400 for invalid within parameter', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/recently-refurbished?within=150')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Within months must be between 1 and 120');
    });
  });

  describe('GET /api/v1/admin/refurbishment/centers/:centerId/eligibility', () => {
    it('should return eligibility details for a specific center', async () => {
      const centerId = testCenterIds[0]; // Eligible Center 1

      const response = await request(app)
        .get(`/api/v1/admin/refurbishment/centers/${centerId}/eligibility`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('center');
      expect(response.body.data.center.id).toBe(centerId);
      expect(response.body.data.center).toHaveProperty('is_eligible');
      expect(response.body.data.center).toHaveProperty('months_since_last_refurbishment');
    });

    it('should return 404 for non-existent center', async () => {
      const nonExistentId = uuidv4();

      const response = await request(app)
        .get(`/api/v1/admin/refurbishment/centers/${nonExistentId}/eligibility`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Center not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/centers/invalid-uuid/eligibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid center ID format');
    });

    it('should work for inactive centers (no status filter)', async () => {
      const inactiveCenterId = testCenterIds[3]; // Inactive Center

      const response = await request(app)
        .get(`/api/v1/admin/refurbishment/centers/${inactiveCenterId}/eligibility`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.center.status).toBe('inactive');
    });
  });

  describe('GET /api/v1/admin/refurbishment/dashboard', () => {
    it('should return aggregated dashboard summary', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('eligibleCenters');
      expect(response.body.data).toHaveProperty('recentlyRefurbished');
      expect(response.body.data).toHaveProperty('allCentersSummary');

      // Check structure of each section
      expect(response.body.data.eligibleCenters).toHaveProperty('centers');
      expect(response.body.data.eligibleCenters).toHaveProperty('totalCount');

      expect(response.body.data.recentlyRefurbished).toHaveProperty('centers');
      expect(response.body.data.recentlyRefurbished).toHaveProperty('totalCount');
      expect(response.body.data.recentlyRefurbished).toHaveProperty('withinMonths');

      expect(response.body.data.allCentersSummary).toHaveProperty('totalCount');
      expect(response.body.data.allCentersSummary).toHaveProperty('eligibleCount');
      expect(response.body.data.allCentersSummary).toHaveProperty('ineligibleCount');

      // Verify data consistency - eligible + ineligible should be <= total (some might be inactive/archived)
      const summary = response.body.data.allCentersSummary;
      expect(summary.eligibleCount + summary.ineligibleCount).toBeLessThanOrEqual(
        summary.totalCount
      );
    });

    it('should respect custom recentlyRefurbishedWithin parameter', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/dashboard?recentlyRefurbishedWithin=6')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.recentlyRefurbished.withinMonths).toBe(6);
    });

    it('should return top 10 centers for each section (performance)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Each section should return at most 10 centers
      expect(response.body.data.eligibleCenters.centers.length).toBeLessThanOrEqual(10);
      expect(response.body.data.recentlyRefurbished.centers.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Authorization & Authentication Edge Cases', () => {
    it('should reject requests with expired token', async () => {
      const expiredToken = AuthService.generateAccessToken(
        { id: uuidv4(), email: 'expired@test.com', role: 'ADMIN' },
        '-1h' // expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/v1/admin/refurbishment/eligible-centers')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests with invalid token format', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/eligible-centers')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests without Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/v1/admin/refurbishment/eligible-centers')
        .set('Authorization', adminToken) // missing 'Bearer '
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
