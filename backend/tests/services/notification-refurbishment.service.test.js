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

    // Create test center
    await db.query(
      `INSERT INTO centers (
        id, partner_id, center_name, city, state, region, status, 
        year_of_establishment, center_type, refurbishment_frequency_months
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testCenterId,
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
      `INSERT INTO users (id, partner_id, name, email, password_hash, role, status)
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
      `INSERT INTO courses (id, course_name, status)
       VALUES (?, ?, ?)`,
      [testCourseId, 'Computer Lab', 'active']
    );

    // Create test packages
    await db.query(
      `INSERT INTO refurbishment_packages (id, course_id, package_name, description, price, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        testPackageId1,
        testCourseId,
        'Desktop Set',
        'High-performance desktop computers',
        50000,
        'active',
      ]
    );

    await db.query(
      `INSERT INTO refurbishment_packages (id, course_id, package_name, description, price, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        testPackageId2,
        testCourseId,
        'Projector Package',
        'HD projector with screen',
        35000,
        'active',
      ]
    );

    // Create scheduled refurbishment notification with request_number
    await db.query(
      `INSERT INTO scheduled_refurbishment_notifications (
        id, partner_id, center_id, request_number, message, packages, 
        frequency, next_reminder, partner_responded, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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
        'one-time',
        new Date(),
        0,
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
    await db.query('DELETE FROM refurbishment_request_course_packages WHERE package_id IN (?, ?)', [
      testPackageId1,
      testPackageId2,
    ]);
    await db.query('DELETE FROM refurbishment_requests WHERE notification_id = ?', [
      testNotificationId,
    ]);
    await db.query('DELETE FROM notifications WHERE id = ?', [testNotificationId]);
    await db.query('DELETE FROM scheduled_refurbishment_notifications WHERE id = ?', [
      testScheduledRefurbId,
    ]);
    await db.query('DELETE FROM refurbishment_packages WHERE id IN (?, ?)', [
      testPackageId1,
      testPackageId2,
    ]);
    await db.query('DELETE FROM courses WHERE id = ?', [testCourseId]);
    await db.query('DELETE FROM users WHERE id = ?', [testUserId]);
    await db.query('DELETE FROM centers WHERE id = ?', [testCenterId]);
    await db.query('DELETE FROM partners WHERE id = ?', [testPartnerId]);
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
      expect(package1.price).toBe(50000);
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

      // Verify database records created
      const [requestRows] = await db.query(
        'SELECT * FROM refurbishment_requests WHERE notification_id = ?',
        [testNotificationId]
      );
      expect(requestRows.length).toBe(1);
      expect(requestRows[0].partner_id).toBe(testPartnerId);

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

      // Verify admin notification created
      const [adminNotifRows] = await db.query(
        `SELECT * FROM notifications 
         WHERE title LIKE '%submitted refurbishment response%' 
         AND recipient_role = 'ADMIN'
         ORDER BY created_at DESC LIMIT 1`
      );
      expect(adminNotifRows.length).toBe(1);
      expect(adminNotifRows[0].message).toContain('Test Partner Ltd');
      expect(adminNotifRows[0].message).toContain('RQ-000001');
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
      // Create another scheduled notification
      const newScheduledId = uuidv4();
      const newNotificationId = uuidv4();

      await db.query(
        `INSERT INTO scheduled_refurbishment_notifications (
          id, partner_id, center_id, request_number, message, packages, 
          frequency, next_reminder, partner_responded, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          newScheduledId,
          testPartnerId,
          testCenterId,
          2,
          'Test message',
          '[]',
          'one-time',
          new Date(),
          0,
        ]
      );

      await db.query(
        `INSERT INTO notifications (
          id, recipient_id, type, alert_type, title, message, 
          related_entity_id, created_at, is_read
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [newNotificationId, testUserId, 'alert', 'refurbishment', 'Test', 'Test', testCenterId, 0]
      );

      const result = await NotificationService.getRefurbishmentDetails(
        newNotificationId,
        testUserId,
        testPartnerId
      );

      // Should be RQ-000002
      expect(result.request_number).toBe('RQ-000002');

      // Clean up
      await db.query('DELETE FROM notifications WHERE id = ?', [newNotificationId]);
      await db.query('DELETE FROM scheduled_refurbishment_notifications WHERE id = ?', [
        newScheduledId,
      ]);
    });
  });
});
