import { describe, expect, it } from 'vitest';
import { formatHistoryTime, getDefaultActivityTime, getTimeSeconds, isValidActivityTime } from './trackerTime';

describe('activity performed times', () => {
  it('defaults to local now only for today, leaving past dates unspecified', () => {
    const now = new Date(2026, 8, 11, 13, 30);
    expect(getDefaultActivityTime('2026-09-11', now)).toBe('13:30');
    expect(getDefaultActivityTime('2026-09-10', now)).toBe('');
  });

  it.each([['00:00', '12:00 AM'], ['12:00', '12:00 PM'], ['13:30:59', '1:30 PM'], ['09:00 AM', '9:00 AM'], [null, '']])(
    'formats %s as %s', (input, expected) => expect(formatHistoryTime(getTimeSeconds(input))).toBe(expected)
  );

  it.each(['24:00', '12:60', '12:30:60', 'not a time'])('rejects invalid time %s', value => {
    expect(isValidActivityTime(value)).toBe(false);
    expect(getTimeSeconds(value)).toBeNull();
  });
});
