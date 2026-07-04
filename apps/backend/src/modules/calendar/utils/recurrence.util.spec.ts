import { prepareRecurringInstances } from './recurrence.util.js';

describe('prepareRecurringInstances', () => {
  it('DAILY: prepares `count` instances spaced one calendar day apart', () => {
    const instances = prepareRecurringInstances(
      '2026-07-06',
      '09:00',
      60,
      'UTC',
      {
        frequency: 'DAILY',
        count: 3,
      },
    );

    expect(instances).toHaveLength(3);
    expect(instances.map((i) => i.startTime.toISOString())).toEqual([
      '2026-07-06T09:00:00.000Z',
      '2026-07-07T09:00:00.000Z',
      '2026-07-08T09:00:00.000Z',
    ]);
  });

  it('WEEKLY: prepares instances spaced seven calendar days apart', () => {
    const instances = prepareRecurringInstances(
      '2026-07-06',
      '09:00',
      30,
      'UTC',
      {
        frequency: 'WEEKLY',
        count: 2,
      },
    );

    expect(instances[1].startTime.toISOString()).toBe(
      '2026-07-13T09:00:00.000Z',
    );
  });

  it('MONTHLY: keeps the same day-of-month across month boundaries', () => {
    const instances = prepareRecurringInstances(
      '2026-07-15',
      '09:00',
      30,
      'UTC',
      {
        frequency: 'MONTHLY',
        count: 3,
      },
    );

    expect(instances.map((i) => i.startTime.toISOString())).toEqual([
      '2026-07-15T09:00:00.000Z',
      '2026-08-15T09:00:00.000Z',
      '2026-09-15T09:00:00.000Z',
    ]);
  });

  it('every instance preserves the original duration', () => {
    const instances = prepareRecurringInstances(
      '2026-07-06',
      '09:00',
      45,
      'UTC',
      {
        frequency: 'DAILY',
        count: 2,
      },
    );

    for (const instance of instances) {
      expect(instance.endTime.getTime() - instance.startTime.getTime()).toBe(
        45 * 60_000,
      );
    }
  });

  describe('daylight saving transitions', () => {
    // US spring-forward: clocks jump from 2:00 AM to 3:00 AM on 2026-03-08 in America/New_York.
    it('DAILY across a spring-forward transition keeps the same local wall-clock time', () => {
      const instances = prepareRecurringInstances(
        '2026-03-07',
        '09:00',
        60,
        'America/New_York',
        { frequency: 'DAILY', count: 3 },
      );

      // 2026-03-07 is still EST (UTC-5); 2026-03-08/09 are EDT (UTC-4) — the UTC instant shifts
      // by an hour even though the local wall-clock time (09:00) does not.
      expect(instances[0].startTime.toISOString()).toBe(
        '2026-03-07T14:00:00.000Z',
      );
      expect(instances[1].startTime.toISOString()).toBe(
        '2026-03-08T13:00:00.000Z',
      );
      expect(instances[2].startTime.toISOString()).toBe(
        '2026-03-09T13:00:00.000Z',
      );
    });

    // US fall-back: clocks fall from 2:00 AM back to 1:00 AM on 2026-11-01 in America/New_York.
    it('DAILY across a fall-back transition keeps the same local wall-clock time', () => {
      const instances = prepareRecurringInstances(
        '2026-10-31',
        '09:00',
        60,
        'America/New_York',
        { frequency: 'DAILY', count: 3 },
      );

      expect(instances[0].startTime.toISOString()).toBe(
        '2026-10-31T13:00:00.000Z',
      );
      expect(instances[1].startTime.toISOString()).toBe(
        '2026-11-01T14:00:00.000Z',
      );
      expect(instances[2].startTime.toISOString()).toBe(
        '2026-11-02T14:00:00.000Z',
      );
    });
  });
});
