const { v4: uuidv4 } = require('uuid');

jest.mock('../../src/database/connection');
jest.mock('../../src/websocket/socket', () => ({
  emitToUser: jest.fn(),
  emitToRole: jest.fn(),
}));
jest.mock('../../src/utils/email.util', () => ({
  sendRefurbishmentNotificationEmail: jest.fn(() => Promise.resolve({ success: true })),
}));

const db = require('../../src/database/connection');
const emailService = require('../../src/utils/email.util');
const RefurbishmentService = require('../../src/api/v1/services/refurbishment.service');

describe('Refurbishment workflow — end-to-end logic', () => {
  let mockConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    emailService.sendRefurbishmentNotificationEmail.mockImplementation(() =>
      Promise.resolve({ success: true })
    );
    mockConnection = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
    };
    db.getConnection = jest.fn().mockResolvedValue(mockConnection);
    db.query = jest.fn();
  });

  describe('Scenario 1: Admin approves request — package notification payload', () => {
    test('buildPackageModificationMessage includes added and removed packages', () => {
      const summary = {
        added: [{ package_name: 'Solar Kit', course_name: 'Solar' }],
        removed: [{ package_name: 'Old Wiring', course_name: 'Electrical' }],
        hasChanges: true,
      };
      const message = RefurbishmentService.buildPackageModificationMessage(
        summary,
        'Test Center'
      );
      expect(message).toContain('Test Center');
      expect(message).toContain('Solar Kit');
      expect(message).toContain('Old Wiring');
    });

    test('buildPackageModificationMessage works when no package changes', () => {
      const message = RefurbishmentService.buildPackageModificationMessage(
        { added: [], removed: [], hasChanges: false },
        'Test Center'
      );
      expect(message).toContain('approved');
      expect(message).not.toContain('Removed packages');
    });

    test('buildPackageModificationMessage labels upgradation packages', () => {
      const message = RefurbishmentService.buildPackageModificationMessage(
        {
          added: [],
          removed: [
            {
              package_name: 'Room HVAC',
              scope: 'upgradation',
            },
          ],
          hasChanges: true,
        },
        'Test Center'
      );
      expect(message).toContain('Room HVAC (Upgradation)');
    });
  });

  describe('Scenario 2: Admin workflow status labels', () => {
    test.each([
      [
        'acknowledgement pending after admin sends ack request',
        {
          status: 'installation_in_progress',
          completion_notified_at: '2026-04-15T09:00:00.000Z',
        },
        'acknowledgement_pending',
        'Acknowledgement Pending',
      ],
      [
        'ready to complete after partner submits',
        {
          status: 'installation_in_progress',
          completion_notified_at: '2026-04-15T09:00:00.000Z',
          partner_completed_at: '2026-04-20T09:00:00.000Z',
        },
        'ready_to_complete',
        'Ready to Complete',
      ],
      [
        'completed status unchanged',
        { status: 'completed', completed_at: '2026-05-01T09:00:00.000Z' },
        'completed',
        'Completed',
      ],
      [
        'normal installation in progress',
        { status: 'installation_in_progress' },
        'installation_in_progress',
        'Installation In Progress',
      ],
    ])('%s', (_label, record, expectedKey, expectedLabel) => {
      const display = RefurbishmentService.getRefurbishmentDisplayStatus(record);
      expect(display.key).toBe(expectedKey);
      expect(display.label).toBe(expectedLabel);
    });
  });

  describe('Scenario 3: Timeline — 4-step workflow', () => {
    test('material procurement shows completed suffix when date set', () => {
      const timeline = RefurbishmentService.buildRefurbishmentStatusTimeline({
        status: 'material_procurement',
        created_at: '2026-01-10T10:00:00.000Z',
        approved_at: '2026-02-01T09:00:00.000Z',
        material_procurement_at: '2026-03-01T09:00:00.000Z',
        updated_at: '2026-03-01T09:00:00.000Z',
      });
      const mat = timeline.events.find((e) => e.key === 'material_procurement');
      expect(mat?.label).toBe('Material Procurement Completed');
    });

    test('hides standalone completed event from timeline', () => {
      const timeline = RefurbishmentService.buildRefurbishmentStatusTimeline({
        status: 'completed',
        created_at: '2026-01-10T10:00:00.000Z',
        approved_at: '2026-02-01T09:00:00.000Z',
        material_procurement_at: '2026-03-01T09:00:00.000Z',
        installation_in_progress_at: '2026-04-01T09:00:00.000Z',
        completed_at: '2026-05-01T09:00:00.000Z',
        updated_at: '2026-05-01T09:00:00.000Z',
      });
      expect(timeline.events.some((e) => e.key === 'completed')).toBe(false);
      expect(timeline.events.some((e) => e.key === 'partner_acknowledgment')).toBe(true);
    });

    test('partner ack step shows pending then submitted labels', () => {
      const pending = RefurbishmentService.buildRefurbishmentStatusTimeline({
        status: 'installation_in_progress',
        created_at: '2026-01-10T10:00:00.000Z',
        installation_in_progress_at: '2026-04-01T09:00:00.000Z',
        completion_notified_at: '2026-04-15T09:00:00.000Z',
        updated_at: '2026-04-15T09:00:00.000Z',
      });
      const pendingAck = pending.events.find((e) => e.key === 'partner_acknowledgment');
      expect(pendingAck?.label).toBe('Partner Acknowledgement Pending');

      const submitted = RefurbishmentService.buildRefurbishmentStatusTimeline({
        status: 'installation_in_progress',
        created_at: '2026-01-10T10:00:00.000Z',
        installation_in_progress_at: '2026-04-01T09:00:00.000Z',
        completion_notified_at: '2026-04-15T09:00:00.000Z',
        partner_completed_at: '2026-04-20T09:00:00.000Z',
        partner_completion_description: 'All work done',
        updated_at: '2026-04-20T09:00:00.000Z',
      });
      const submittedAck = submitted.events.find((e) => e.key === 'partner_acknowledgment');
      expect(submittedAck?.label).toBe('Partner Acknowledgement Submitted');
      expect(submittedAck?.detail).toBe('All work done');
    });
  });

  describe('Scenario 4: Partner consent text', () => {
    test('includes upgradation clause when requested', () => {
      const withUpgradation =
        RefurbishmentService.buildPartnerAcknowledgmentConsentText(true);
      expect(withUpgradation).toContain('upgradation work');
    });

    test('excludes upgradation clause when not requested', () => {
      const withoutUpgradation =
        RefurbishmentService.buildPartnerAcknowledgmentConsentText(false);
      expect(withoutUpgradation).not.toContain('upgradation work');
      expect(withoutUpgradation).toContain('refurbishment work');
    });
  });

  describe('Scenario 5: Admin review completion summary', () => {
    test('includes partner consent snapshot for audit', () => {
      const summary = RefurbishmentService.buildRefurbishmentCompletionSummary(
        {
          completion_notified_at: '2026-04-15T09:00:00.000Z',
          partner_completed_at: '2026-04-20T09:00:00.000Z',
          partner_completion_description: 'Done',
          partner_acknowledgment_consent: 1,
          partner_acknowledgment_consent_at: '2026-04-20T09:00:00.000Z',
          partner_acknowledgment_consent_text: 'I hereby acknowledge...',
        },
        [{ url: '/file.jpg' }],
        []
      );
      expect(summary.completion_notified_at).toBe('2026-04-15T09:00:00.000Z');
      expect(summary.partner.consent).toBe(true);
      expect(summary.partner.consent_text).toBe('I hereby acknowledge...');
    });
  });

  describe('Scenario 6: requestPartnerAcknowledgment', () => {
    const requestId = uuidv4();
    const adminUserId = uuidv4();

    test('sets completion_notified_at and notifies partner', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[{ role: 'ADMIN', full_name: 'Admin' }]])
        .mockResolvedValueOnce([
          [
            {
              id: requestId,
              status: 'installation_in_progress',
              completion_notified_at: null,
              partner_completed_at: null,
              center_name: 'Center A',
              partner_id: uuidv4(),
              partner_name: 'Partner A',
              request_number: 'REQ-2026-001',
            },
          ],
        ])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: uuidv4(), email: 'p@test.com' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await RefurbishmentService.requestPartnerAcknowledgment(
        requestId,
        adminUserId
      );
      expect(result.success).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();
      const updateCall = mockConnection.query.mock.calls.find(([sql]) =>
        sql.includes('completion_notified_at = NOW()')
      );
      expect(updateCall).toBeDefined();
    });

    test('rejects duplicate acknowledgment request', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[{ role: 'ADMIN', full_name: 'Admin' }]])
        .mockResolvedValueOnce([
          [
            {
              id: requestId,
              status: 'installation_in_progress',
              completion_notified_at: '2026-04-15T09:00:00.000Z',
              partner_completed_at: null,
              center_name: 'Center A',
              partner_id: uuidv4(),
              partner_name: 'Partner A',
              request_number: 'REQ-2026-001',
            },
          ],
        ]);

      await expect(
        RefurbishmentService.requestPartnerAcknowledgment(requestId, adminUserId)
      ).rejects.toThrow('already been requested');
      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });

  describe('Scenario 7: submitPartnerCompletion', () => {
    const requestId = uuidv4();
    const partnerId = uuidv4();
    const consentText = RefurbishmentService.buildPartnerAcknowledgmentConsentText(false);

    test('requires consent, statement, and files', async () => {
      await expect(
        RefurbishmentService.submitPartnerCompletion(requestId, partnerId, {
          description: '',
          fileUrls: [],
          consent: false,
          consentText: '',
        })
      ).rejects.toThrow('Acknowledgment statement is required');
    });

    test('saves consent fields and notifies admin', async () => {
      mockConnection.query
        .mockResolvedValueOnce([
          [
            {
              id: requestId,
              status: 'installation_in_progress',
              center_id: uuidv4(),
              completion_notified_at: '2026-04-15T09:00:00.000Z',
              partner_completed_at: null,
              is_upgradation_requested: 0,
              center_name: 'Center A',
              partner_id: partnerId,
              partner_name: 'Partner A',
              request_number: 'REQ-2026-001',
            },
          ],
        ])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: uuidv4() }]]);

      const result = await RefurbishmentService.submitPartnerCompletion(
        requestId,
        partnerId,
        {
          description: 'Work completed as per scope',
          fileUrls: [{ url: '/uploads/test.pdf', name: 'test.pdf', type: 'document' }],
          consent: true,
          consentText,
        }
      );

      expect(result.success).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();

      const updateCall = mockConnection.query.mock.calls.find(([sql]) =>
        sql.includes('partner_acknowledgment_consent = 1')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toContain(consentText);

      const adminNotifCall = mockConnection.query.mock.calls.find(([sql]) =>
        sql.includes('refurbishment_partner_acknowledgment')
      );
      expect(adminNotifCall).toBeDefined();

      const partnerNotifUpdate = mockConnection.query.mock.calls.find(([sql]) =>
        sql.includes("alert_type = 'refurbishment_acknowledgment_submitted'")
      );
      expect(partnerNotifUpdate).toBeDefined();
    });

    test('rejects submit before admin requests acknowledgment', async () => {
      mockConnection.query.mockResolvedValueOnce([
        [
          {
            id: requestId,
            status: 'installation_in_progress',
            partner_id: partnerId,
            completion_notified_at: null,
            partner_completed_at: null,
          },
        ],
      ]);

      await expect(
        RefurbishmentService.submitPartnerCompletion(requestId, partnerId, {
          description: 'Done',
          fileUrls: [{ url: '/f.pdf', name: 'f.pdf' }],
          consent: true,
          consentText,
        })
      ).rejects.toThrow('not been requested');
      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });

  describe('Scenario 8: Past requests badge count + display status', () => {
    test('enriches rows with display_status and returns readyToCompleteCount', async () => {
      db.query
        .mockResolvedValueOnce([[{ total: 2 }]])
        .mockResolvedValueOnce([
          [
            {
              id: uuidv4(),
              status: 'installation_in_progress',
              completion_notified_at: '2026-04-15T09:00:00.000Z',
              partner_completed_at: null,
            },
            {
              id: uuidv4(),
              status: 'installation_in_progress',
              completion_notified_at: '2026-04-15T09:00:00.000Z',
              partner_completed_at: '2026-04-20T09:00:00.000Z',
            },
          ],
        ])
        .mockResolvedValueOnce([[{ readyToCompleteCount: 3 }]]);

      const result = await RefurbishmentService.getPastRefurbishmentRequests(50, 0, null);

      expect(result.readyToCompleteCount).toBe(3);
      expect(result.requests[0].display_status).toBe('acknowledgement_pending');
      expect(result.requests[0].display_status_label).toBe('Acknowledgement Pending');
      expect(result.requests[1].display_status).toBe('ready_to_complete');
      expect(result.requests[1].display_status_label).toBe('Ready to Complete');
    });
  });

  describe('Scenario 9: Admin complete without partner ack (shortcut)', () => {
    test('completeRefurbishment accepts installation_in_progress status', async () => {
      const requestId = uuidv4();
      const adminUserId = uuidv4();

      mockConnection.query
        .mockResolvedValueOnce([[{ role: 'ADMIN', full_name: 'Admin' }]])
        .mockResolvedValueOnce([
          [
            {
              id: requestId,
              status: 'installation_in_progress',
              center_id: uuidv4(),
              center_name: 'Center A',
              partner_id: uuidv4(),
              partner_name: 'Partner A',
              request_number: 'REQ-2026-001',
            },
          ],
        ])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: uuidv4() }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await RefurbishmentService.completeRefurbishment(
        requestId,
        adminUserId,
        {
          completion_statement: 'Completed directly',
          completion_date: '2026-05-01',
          completion_images: [{ url: '/admin.jpg', name: 'admin.jpg' }],
        }
      );

      expect(result.success).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();
      const statusUpdate = mockConnection.query.mock.calls.find(([sql]) =>
        sql.includes("status = 'completed'")
      );
      expect(statusUpdate).toBeDefined();
    });

    test('completeRefurbishment allows empty statement and no files', async () => {
      const requestId = uuidv4();
      const adminUserId = uuidv4();

      mockConnection.query
        .mockResolvedValueOnce([[{ role: 'ADMIN', full_name: 'Admin' }]])
        .mockResolvedValueOnce([
          [
            {
              id: requestId,
              status: 'installation_in_progress',
              center_id: uuidv4(),
              center_name: 'Center A',
              partner_id: uuidv4(),
              partner_name: 'Partner A',
              request_number: 'REQ-2026-001',
            },
          ],
        ])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ id: uuidv4() }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await RefurbishmentService.completeRefurbishment(
        requestId,
        adminUserId,
        {
          completion_statement: '',
          completion_date: '2026-05-01',
          completion_images: [],
        }
      );

      expect(result.success).toBe(true);
      const statusUpdate = mockConnection.query.mock.calls.find(([sql]) =>
        sql.includes("status = 'completed'")
      );
      expect(statusUpdate?.[1]).toContain(null);
    });
  });

  describe('parsePackageModificationSummary', () => {
    it('returns empty summary when raw is null', () => {
      expect(RefurbishmentService.parsePackageModificationSummary(null)).toEqual({
        added: [],
        removed: [],
        hasChanges: false,
        approved_at: null,
      });
    });

    it('parses JSON string with added and removed packages', () => {
      const raw = JSON.stringify({
        added: [{ package_id: 'a1', package_name: 'Lab A', course_id: 'c1', course_name: 'Course 1' }],
        removed: [{ package_id: 'r1', package_name: 'Lab B', course_id: 'c1', course_name: 'Course 1' }],
        hasChanges: true,
        approved_at: '2026-06-08T10:00:00.000Z',
      });
      expect(RefurbishmentService.parsePackageModificationSummary(raw)).toEqual({
        added: [{ package_id: 'a1', package_name: 'Lab A', course_id: 'c1', course_name: 'Course 1' }],
        removed: [{ package_id: 'r1', package_name: 'Lab B', course_id: 'c1', course_name: 'Course 1' }],
        hasChanges: true,
        approved_at: '2026-06-08T10:00:00.000Z',
      });
    });

    it('sets hasChanges when added or removed arrays are non-empty', () => {
      const parsed = RefurbishmentService.parsePackageModificationSummary({
        added: [{ package_id: 'x' }],
        removed: [],
      });
      expect(parsed.hasChanges).toBe(true);
    });
  });
});
