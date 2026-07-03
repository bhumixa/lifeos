import {
  computeProgressPercent,
  computeRemainingValue,
  isProgressComplete,
} from './goal-progress.util.js';

describe('computeProgressPercent', () => {
  it('computes a whole-number percent', () => {
    expect(computeProgressPercent(5, 10)).toBe(50);
    expect(computeProgressPercent(1, 3)).toBe(33);
  });

  it('caps at 100 when currentValue exceeds targetValue', () => {
    expect(computeProgressPercent(15, 10)).toBe(100);
  });

  it('returns 0 for a zero currentValue', () => {
    expect(computeProgressPercent(0, 10)).toBe(0);
  });

  it('returns 0 rather than dividing by zero when targetValue is not positive', () => {
    expect(computeProgressPercent(5, 0)).toBe(0);
    expect(computeProgressPercent(5, -10)).toBe(0);
  });
});

describe('computeRemainingValue', () => {
  it('computes the gap to target', () => {
    expect(computeRemainingValue(3, 10)).toBe(7);
  });

  it('never goes negative once currentValue passes targetValue', () => {
    expect(computeRemainingValue(15, 10)).toBe(0);
  });
});

describe('isProgressComplete', () => {
  it('is false while under target', () => {
    expect(isProgressComplete(9, 10)).toBe(false);
  });

  it('is true at exactly target', () => {
    expect(isProgressComplete(10, 10)).toBe(true);
  });

  it('is true past target', () => {
    expect(isProgressComplete(11, 10)).toBe(true);
  });
});
