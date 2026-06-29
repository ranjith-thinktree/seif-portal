const RefurbishmentService = require('../../src/api/v1/services/refurbishment.service');

describe('Refurbishment status dates', () => {
  test('buildRefurbishmentStatusTimeline uses dedicated status date columns', () => {
    const timeline = RefurbishmentService.buildRefurbishmentStatusTimeline({
      status: 'completed',
      created_at: '2026-01-10T10:00:00.000Z',
      approved_at: '2026-02-01T09:00:00.000Z',
      material_procurement_at: '2026-03-01T09:00:00.000Z',
      installation_in_progress_at: '2026-04-01T09:00:00.000Z',
      completed_at: '2026-05-01T09:00:00.000Z',
      completion_statement: 'Work finished successfully',
      updated_at: '2026-05-01T09:00:00.000Z',
    });

    const byKey = Object.fromEntries(timeline.events.map((e) => [e.key, e]));

    expect(byKey.approved?.occurred_at).toBe('2026-02-01T09:00:00.000Z');
    expect(byKey.material_procurement?.occurred_at).toBe(
      '2026-03-01T09:00:00.000Z'
    );
    expect(byKey.material_procurement?.label).toBe('Material Procurement Completed');
    expect(byKey.installation_in_progress?.occurred_at).toBe(
      '2026-04-01T09:00:00.000Z'
    );
    expect(byKey.completed).toBeUndefined();
  });

  test('buildRefurbishmentStatusTimeline includes partner acknowledgement step', () => {
    const timeline = RefurbishmentService.buildRefurbishmentStatusTimeline({
      status: 'installation_in_progress',
      created_at: '2026-01-10T10:00:00.000Z',
      approved_at: '2026-02-01T09:00:00.000Z',
      material_procurement_at: '2026-03-01T09:00:00.000Z',
      installation_in_progress_at: '2026-04-01T09:00:00.000Z',
      completion_notified_at: '2026-04-15T09:00:00.000Z',
      updated_at: '2026-04-15T09:00:00.000Z',
    });

    const ack = timeline.events.find((e) => e.key === 'partner_acknowledgment');
    expect(ack?.label).toBe('Partner Acknowledgement Pending');
    expect(timeline.current_status).toBe('acknowledgement_pending');
  });

  test('getRefurbishmentDisplayStatus returns ready_to_complete after partner submit', () => {
    const display = RefurbishmentService.getRefurbishmentDisplayStatus({
      status: 'installation_in_progress',
      partner_completed_at: '2026-04-20T09:00:00.000Z',
    });
    expect(display.key).toBe('ready_to_complete');
    expect(display.label).toBe('Ready to Complete');
  });

  test('parseWorkflowStatusDate accepts ISO date strings', () => {
    const parsed = RefurbishmentService.parseWorkflowStatusDate('2026-06-15');
    expect(parsed).toBeInstanceOf(Date);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });

  test('parseWorkflowStatusDate rejects invalid values', () => {
    expect(() => RefurbishmentService.parseWorkflowStatusDate('not-a-date')).toThrow(
      'Invalid status date'
    );
  });
});
