import { confidenceVariant, formatConfidence, isRiskInsight } from './ai-display';

describe('formatConfidence', () => {
  it('renders a 0.0-1.0 float as a whole-number percentage', () => {
    expect(formatConfidence(0.85)).toBe('85%');
    expect(formatConfidence(0)).toBe('0%');
    expect(formatConfidence(1)).toBe('100%');
  });
});

describe('confidenceVariant', () => {
  it('grades confidence into success/info/neutral bands', () => {
    expect(confidenceVariant(0.9)).toBe('success');
    expect(confidenceVariant(0.5)).toBe('info');
    expect(confidenceVariant(0.1)).toBe('neutral');
  });
});

describe('isRiskInsight', () => {
  it('is true when sourceData.flags includes "risk"', () => {
    expect(isRiskInsight({ flags: ['risk'] })).toBe(true);
  });

  it('is false when flags is empty, missing, or sourceData is null', () => {
    expect(isRiskInsight({ flags: [] })).toBe(false);
    expect(isRiskInsight({})).toBe(false);
    expect(isRiskInsight(null)).toBe(false);
  });
});
