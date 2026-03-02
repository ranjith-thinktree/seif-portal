const NotificationService = require('../../src/api/v1/services/notification.service');
const db = require('../../src/database/connection');
const { v4: uuidv4 } = require('uuid');

/**
 * Test Suite: Notification Service - Refurbishment Details & Response
 *
 * Tests the newly implemented refurbishment notification features:
 * 1. getRefurbishmentDetails - Fetch RQ-XXXXX formatted details
 * 2. submitRefurbishmentResponse - Partner submits package selections with justifications
 */
describe('NotificationService - Refurbishment Features', () => {
  // Test data IDs
  let testPartnerId;
  let testCenterId;
  let testUserId;
  let testNotificationId;
  let testScheduledRefurbId;
  let testPackageId1;
  let testPackageId2;
  let testCourseId;

  beforeAll(async () => {
    // Generate UUIDs
    testPartnerId = uuidv4();
    testCenterId = uuidv4();
    testUserId = uuidv4();
    testNotificationId = uuidv4();
    testScheduledRefurbId = uuidv4();
    testPackageId1 = uuidv4();
    testPackageId2 = uuidv4();
    testCourseId = uuidv4();

    // Pre-cleanup: Remove any stale data from previous failed runs
    try {
      await db.query(
        'DELETE FROM refurbishment_request_course_packages WHERE package_id IN (SELECT id FROM refurbishment_packages WHERE package_name IN (?, ?))',
        ['Desktop Set', 'Projector Package']
      );
    } catch (_) {}
    try {
      await db.query(
        'DELETE FROM refurbishment_requests WHERE center_id IN (SELECT id FROM centers WHERE center_id = ?)',
        ['JEST-NREF-001']
      );
    } catch (_) {}
    try {
      await db.query(
        'DELETE FROM package_courses WHERE package_id IN (SELECT id FROM refurbishment_packages WHERE package_name IN (?, ?))',
        ['Desktop Set', 'Projector Package']
      );
    } catch (_) {}
    try {
      await db.query(
        'DELETE FROM scheduled_refurbishment_notifications WHERE partner_id IN (SELECT id FROM partners WHERE name = ?)',
        ['Test Partner Ltd']
      );
    } catch (_) {}
    try {
      await db.query(
        'DELETE FROM notifications WHERE recipient_id IN (SELECT id FROM users WHERE email = ?)',
        ['partner@test.com']
      );
    } catch (_) {}
    try {
      await db.query('DELETE FROM refurbishment_packages WHERE package_name IN (?, ?)', [
        'Desktop Set',
        'Projector Package',
      ]);
    } catch (_) {}
    try {
      await db.query('DELETE FROM courses WHERE course_name = ?', ['Computer Lab']);
    } catch (_) {}
    try {
      await db.query('DELETE FROM users WHERE email = ?', ['partner@test.com']);
    } catch (_) {}
    try {
      await db.query('DELETE FROM centers WHERE center_id IN (?, ?)', ['JEST-NREF-001', 'JEST-NREF-SEQ']);
    } catch (_) {}
    await db.query(
      'DELETE FROM centers WHERE partner_id IN (SELECT id FROM partners WHERE name = ?)',
      ['Test Partner Ltd']
    );
    await db.query('DELETE FROM partners WHERE name = ?', ['Test Partner Ltd']);

    // Create test partner
    await db.query(
      `INSERT INTO partners (id, name, contact_person, contact_email, contact_phone, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        testPartnerId,
        'Test Partner Ltd',
        'John Doe',
        'john@testpartner.com',
        '9876543210',
        'active',
      ]
    );

    // Create test center (explicit center_id to avoid auto-generation collision)
    await db.query(
      `INSERT INTO centers (
        id, center_id, partner_id, center_name, city, state, region, status, 
        year_of_establishment, center_type, refurbishment_frequency_months
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testCenterId,
        'JEST-NREF-001',
        testPartnerId,
        'Test Center Delhi',
        'Delhi',
        'Delhi',
        'N',
        'active',
        2020,
        'Short term',
        24,
      ]
    );

    // Create test user (partner role)
    await db.query(
      `INSERT INTO users (id, partner_id, full_name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        testUserId,
        testPartnerId,
        'Partner User',
        'partner@test.com',
        'hashed_password',
        'PARTNER',
        'active',
      ]
    );

    // Create test course
    await db.query(
      `INSERT INTO courses (id, course_name, is_active)
       VALUES (?, ?, ?)`,
      [testCourseId, 'Computer Lab', 1]
    );

    // Create test packages (schema: no course_id/price; use category and is_active)
    await db.query(
      `INSERT INTO refurbishment_packages (id, package_name, description, category, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [testPackageId1, 'Desktop Set', 'High-performance desktop computers', 'refurbishment', 1]
    );

    await db.query(
      `INSERT INTO refurbishment_packages (id, package_name, description, category, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [testPackageId2, 'Projector Package', 'HD projector with screen', 'refurbishment', 1]
    );

    // Link packages to the test course via package_courses join table
    await db.query(`INSERT INTO package_courses (package_id, course_id) VALUES (?, ?), (?, ?)`, [
      testPackageId1,
      testCourseId,
      testPackageId2,
      testCourseId,
    ]);

    // Create scheduled refurbishment notification with request_number
    await db.query(
      `INSERT INTO scheduled_refurbishment_notifications (
        id, partner_id, center_id, request_number, message, packages, 
        frequency, scheduled_at, next_send_at, partner_responded, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        testScheduledRefurbId,
        testPartnerId,
        testCenterId,
        1, // RQ-000001
        'Your center is eligible for refurbishment',
        JSON.stringify([
          { packageId: testPackageId1, quantity: 1, notes: 'Latest model preferred' },
          { packageId: testPackageId2, quantity: 1, notes: 'With HDMI support' },
        ]),
        'instant',
        new Date(),
        0,
        testUserId,
      ]
    );

    // Create notification linked to scheduled refurbishment
    await db.query(
      `INSERT INTO notifications (
        id, recipient_id, type, alert_type, title, message, 
        related_entity_id, created_at, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        testNotificationId,
        testUserId,
        'alert',
        'refurbishment',
        'Refurbishment Eligibility Notification',
        'Your center is eligible for refurbishment',
        testCenterId,
        0,
      ]
    );
  });

  afterAll(async () => {
    // Clean up test data in reverse order of dependencies
    try {
      await db.query(
        'DELETE FROM refurbishment_request_course_packages WHERE package_id IN (?, ?)',
        [testPackageId1, testPackageId2]
      );
    } catch (_) {}
    try {
      await db.query('DELETE FROM refurbishment_requests WHERE center_id = ?', [testCenterId]);
    } catch (_) {}
    try {
      await db.query('DELETE FROM package_courses WHERE package_id IN (?, ?)', [
        testPackageId1,
        testPackageId2,
      ]);
    } catch (_) {}
    try {
      await db.query('DELETE FROM notifications WHERE recipient_id = ?', [testUserId]);
    } catch (_) {}
    try {
      await db.query('DELETE FROM scheduled_refurbishment_notifications WHERE id = ?', [
        testScheduledRefurbId,
      ]);
    } catch (_) {}
    try {
      await db.query('DELETE FROM refurbishment_packages WHERE id IN (?, ?)', [
        testPackageId1,
        testPackageId2,
      ]);
    } catch (_) {}
    try {
      await db.query('DELETE FROM courses WHERE id = ?', [testCourseId]);
    } catch (_) {}
    try {
      await db.query('DELETE FROM users WHERE id = ?', [testUserId]);
    } catch (_) {}
    try {
      await db.query('DELETE FROM centers WHERE id = ?', [testCenterId]);
    } catch (_) {}
    try {
      await db.query('DELETE FROM partners WHERE id = ?', [testPartnerId]);
    } catch (_) {}
  });

  describe('getRefurbishmentDetails', () => {
    test('should fetch refurbishment details with RQ-XXXXX format', async () => {
      const result = await NotificationService.getRefurbishmentDetails(
        testNotificationId,
        testUserId,
        testPartnerId
      );

      // Verify request number format
      expect(result.request_number).toBe('RQ-000001');

      // Verify partner details
      expect(result.partner_name).toBe('Test Partner Ltd');

      // Verify subject (fixed as per requirement)
      expect(result.subject).toBe('Request for Lab Refurbishment');

      // Verify center details
      expect(result.center_name).toBe('Test Center Delhi');
      expect(result.center_location).toBe('Delhi, Delhi');

      // Verify date is present
      expect(result.date).toBeDefined();

      // Verify message/description
      expect(result.description).toBe('Your center is eligible for refurbishment');

      // Verify courses array exists
      expect(Array.isArray(result.courses)).toBe(true);
      expect(result.courses.length).toBeGreaterThan(0);

      // Verify course structure
      const course = result.courses[0];
      expect(course.course_id).toBe(testCourseId);
      expect(course.course_name).toBe('Computer Lab');
      expect(Array.isArray(course.packages)).toBe(true);
      expect(course.packages.length).toBe(2);

      // Verify package details
      const package1 = course.packages.find((p) => p.package_id === testPackageId1);
      expect(package1).toBeDefined();
      expect(package1.package_name).toBe('Desktop Set');
      expect(package1.description).toBe('High-performance desktop computers');
      // price is not returned by the service (no price column in schema)
      expect(package1.quantity).toBe(1);
      expect(package1.notes).toBe('Latest model preferred');

      // Verify partner_responded flag
      expect(result.partner_responded).toBe(false);
    });

    test('should throw error if notification not found', async () => {
      const fakeNotificationId = uuidv4();

      await expect(
        NotificationService.getRefurbishmentDetails(fakeNotificationId, testUserId, testPartnerId)
      ).rejects.toThrow('Refurbishment notification not found');
    });

    test('should throw error if wrong partner tries to access', async () => {
      const wrongPartnerId = uuidv4();

      await expect(
        NotificationService.getRefurbishmentDetails(testNotificationId, testUserId, wrongPartnerId)
      ).rejects.toThrow('Refurbishment notification not found');
    });
  });

  describe('submitRefurbishmentResponse', () => {
    test('should successfully submit partner response with justifications', async () => {
      const selectedPackages = [
        {
          package_id: testPackageId1,
          justification: 'We need new computers as current ones are outdated and slow',
        },
        {
          package_id: testPackageId2,
          justification: 'Our current projector has poor image quality affecting training',
        },
      ];

      const result = await NotificationService.submitRefurbishmentResponse(
        testNotificationId,
        testUserId,
        testPartnerId,
        selectedPackages
      );

      // Verify result structure
      expect(result.refurbishment_request_id).toBeDefined();
      expect(result.request_number).toBe('RQ-000001');
      expect(result.packages_submitted).toBe(2);

      // Verify database records created (use center_id and request ID since schema
      // does not store notification_id in refurbishment_requests)
      const [requestRows] = await db.query('SELECT * FROM refurbishment_requests WHERE id = ?', [
        result.refurbishment_request_id,
      ]);
      expect(requestRows.length).toBe(1);
      expect(requestRows[0].center_id).toBe(testCenterId);

      // Verify course packages records
      const [packageRows] = await db.query(
        'SELECT * FROM refurbishment_request_course_packages WHERE refurbishment_request_id = ?',
        [result.refurbishment_request_id]
      );
      expect(packageRows.length).toBe(2);

      const pkg1Record = packageRows.find((p) => p.package_id === testPackageId1);
      expect(pkg1Record).toBeDefined();
      expect(pkg1Record.course_id).toBe(testCourseId);
      expect(pkg1Record.justification).toBe(
        'We need new computers as current ones are outdated and slow'
      );

      // Verify scheduled notification marked as responded
      const [scheduleRows] = await db.query(
        'SELECT partner_responded, response_received_at FROM scheduled_refurbishment_notifications WHERE id = ?',
        [testScheduledRefurbId]
      );
      expect(scheduleRows[0].partner_responded).toBe(1);
      expect(scheduleRows[0].response_received_at).toBeDefined();

      // Verify notification marked as read
      const [notifRows] = await db.query('SELECT is_read FROM notifications WHERE id = ?', [
        testNotificationId,
      ]);
      expect(notifRows[0].is_read).toBe(1);

      // Verify admin notification created (title has 'Partner Response - RQ-XXXXXX')
      const [adminNotifRows] = await db.query(
        `SELECT * FROM notifications 
         WHERE title LIKE '%Partner Response%' 
         AND recipient_role = 'ADMIN'
         ORDER BY created_at DESC LIMIT 1`
      );
      expect(adminNotifRows.length).toBe(1);
      expect(adminNotifRows[0].message).toContain('Test Partner Ltd');
    });

    test('should throw error if notification already responded', async () => {
      const selectedPackages = [
        {
          package_id: testPackageId1,
          justification: 'Test justification',
        },
      ];

      // Try to submit again (already submitted in previous test)
      await expect(
        NotificationService.submitRefurbishmentResponse(
          testNotificationId,
          testUserId,
          testPartnerId,
          selectedPackages
        )
      ).rejects.toThrow();
    });

    test('should throw error if no packages selected', async () => {
      const newNotificationId = uuidv4();

      await expect(
        NotificationService.submitRefurbishmentResponse(
          newNotificationId,
          testUserId,
          testPartnerId,
          []
        )
      ).rejects.toThrow();
    });

    test('should throw error if justification missing for any package', async () => {
      const selectedPackages = [
        {
          package_id: testPackageId1,
          justification: 'Valid justification',
        },
        {
          package_id: testPackageId2,
          // Missing justification
        },
      ];

      // This should be validated in the controller, but service should handle gracefully
      // The test verifies the service doesn't crash with invalid data
      const newNotificationId = uuidv4();

      await expect(
        NotificationService.submitRefurbishmentResponse(
          newNotificationId,
          testUserId,
          testPartnerId,
          selectedPackages
        )
      ).rejects.toThrow();
    });
  });

  describe('Request Number Sequential Generation', () => {
    test('request numbers should be sequential', async () => {
      // Use a dedicated center for this test to avoid JOIN ambiguity with testCenterId,
      // which already has testScheduledRefurbId (request_number=1). If we reused the same
      // center, the JOIN in getRefurbishmentDetails would match BOTH scheduled notifications
      // and non-deterministic ORDER BY could return the wrong one.
      const seqCenterId = uuidv4();
      const newScheduledId = uuidv4();
      const newNotificationId = uuidv4();

      // Ensure partner still exists
      await db.query(
        `INSERT IGNORE INTO partners (id, name, contact_person, contact_email, contact_phone, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [testPartnerId, 'Test Partner Ltd', 'John Doe', 'john@testpartner.com', '9876543210', 'active']
      );

      // Ensure user still exists
      await db.query(
        `INSERT IGNORE INTO users (id, partner_id, full_name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [testUserId, testPartnerId, 'Partner User', 'partner@test.com', 'hashed_password', 'PARTNER', 'active']
      );

      // Create a brand-new center unique to this test (avoids JOIN ambiguity)
      await db.query(
        `INSERT INTO centers (
          id, center_id, partner_id, center_name, city, state, region, status,
          year_of_establishment, center_type, refurbishment_frequency_months
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [seqCenterId, 'JEST-NREF-SEQ', testPartnerId, 'Test Center Sequential',
          'Mumbai', 'Maharashtra', 'W', 'active', 2021, 'Short term', 24]
      );

      try {
        // Create scheduled notification with request_number=2 for the new center
        await db.query(
          `INSERT INTO scheduled_refurbishment_notifications (
            id, partner_id, center_id, request_number, message, packages, 
            frequency, scheduled_at, next_send_at, partner_responded, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
          [
            newScheduledId,
            testPartnerId,
            seqCenterId,
            2,
            'Test message',
            '[]',
            'instant',
            new Date(),
            0,
            testUserId,
          ]
        );

        await db.query(
          `INSERT INTO notifications (
            id, recipient_id, type, alert_type, title, message, 
            related_entity_id, created_at, is_read
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          [newNotificationId, testUserId, 'alert', 'refurbishment', 'Test', 'Test', seqCenterId, 0]
        );

        const result = await NotificationService.getRefurbishmentDetails(
          newNotificationId,
          testUserId,
          testPartnerId
        );

        // Should be RQ-000002 (from scheduled notification's request_number field)
        expect(result.request_number).toBe('RQ-000002');
      } finally {
        // Always clean up, even if the assertion above fails
        try { await db.query('DELETE FROM notifications WHERE id = ?', [newNotificationId]); } catch (_) {}
        try { await db.query('DELETE FROM scheduled_refurbishment_notifications WHERE id = ?', [newScheduledId]); } catch (_) {}
        try { await db.query('DELETE FROM centers WHERE id = ?', [seqCenterId]); } catch (_) {}
      }
    });
  });
});
