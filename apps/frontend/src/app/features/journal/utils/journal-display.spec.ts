import type { JournalEntry } from '@lifeos/shared-types';
import { energyLevel, entryHeadline, entryPreview, formatEntryDate, toDateOnly } from './journal-display';

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'entry-1',
    date: '2026-07-04',
    type: 'FREEFORM',
    title: null,
    content: null,
    mood: null,
    energy: null,
    productivity: null,
    gratitude: [],
    wins: [],
    lessons: null,
    tomorrowPlan: null,
    tags: [],
    weather: null,
    location: null,
    intention: null,
    topPriorities: [],
    affirmation: null,
    visualization: null,
    expectedChallenges: null,
    wentWell: null,
    wentWrong: null,
    plannerReflection: null,
    habitReflection: null,
    goalReflection: null,
    goalId: null,
    plannerDayId: null,
    attachments: [],
    createdAt: '2026-07-04T08:00:00.000Z',
    updatedAt: '2026-07-04T08:00:00.000Z',
    ...overrides,
  };
}

describe('energyLevel', () => {
  it('maps each Energy value to its 1-5 position', () => {
    expect(energyLevel('VERY_LOW')).toBe(1);
    expect(energyLevel('NORMAL')).toBe(3);
    expect(energyLevel('VERY_HIGH')).toBe(5);
  });
});

describe('entryHeadline', () => {
  it('prefers a user-supplied title', () => {
    expect(entryHeadline(makeEntry({ title: 'A great start', type: 'MORNING' }))).toBe('A great start');
  });

  it('falls back to a generic "<Type> journal" label when title is blank', () => {
    expect(entryHeadline(makeEntry({ title: null, type: 'EVENING' }))).toBe('Evening journal');
  });

  it('treats a whitespace-only title as blank', () => {
    expect(entryHeadline(makeEntry({ title: '   ', type: 'FREEFORM' }))).toBe('Freeform journal');
  });
});

describe('entryPreview', () => {
  it('prefers content, then falls back through intention/wentWell/gratitude', () => {
    expect(entryPreview(makeEntry({ content: 'Body text' }))).toBe('Body text');
    expect(entryPreview(makeEntry({ content: null, intention: 'Stay focused' }))).toBe('Stay focused');
    expect(entryPreview(makeEntry({ content: null, wentWell: 'Shipped the feature' }))).toBe('Shipped the feature');
    expect(entryPreview(makeEntry({ content: null, gratitude: ['My health'] }))).toBe('My health');
  });

  it('truncates long text with an ellipsis', () => {
    const long = 'a'.repeat(200);
    const preview = entryPreview(makeEntry({ content: long }), 140);
    expect(preview.endsWith('…')).toBe(true);
    expect(preview.length).toBe(141);
  });

  it('returns an empty string when no candidate field has content', () => {
    expect(entryPreview(makeEntry())).toBe('');
  });
});

describe('formatEntryDate', () => {
  it('formats a "YYYY-MM-DD" string without a local-timezone day shift', () => {
    // Exact locale formatting (e.g. "Jul 4, 2026" vs "4 Jul 2026") varies by test environment —
    // what matters is the day-of-month never shifts backward across the UTC parse.
    const formatted = formatEntryDate('2026-07-04');
    expect(formatted).toContain('4');
    expect(formatted).toContain('2026');
  });
});

describe('toDateOnly', () => {
  it('formats a local Date as "YYYY-MM-DD"', () => {
    expect(toDateOnly(new Date(2026, 6, 4))).toBe('2026-07-04');
  });

  it('pads single-digit months and days', () => {
    expect(toDateOnly(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
