import {
  computeBackoffMinutes,
  MAX_DELIVERY_ATTEMPTS,
} from './retry-backoff.util.js';

describe('computeBackoffMinutes', () => {
  it('doubles the delay each attempt starting from 2 minutes', () => {
    expect(computeBackoffMinutes(1)).toBe(2);
    expect(computeBackoffMinutes(2)).toBe(4);
    expect(computeBackoffMinutes(3)).toBe(8);
    expect(computeBackoffMinutes(4)).toBe(16);
  });

  it('caps the delay at 60 minutes rather than growing unbounded', () => {
    expect(computeBackoffMinutes(10)).toBe(60);
    expect(computeBackoffMinutes(MAX_DELIVERY_ATTEMPTS)).toBeLessThanOrEqual(
      60,
    );
  });
});
