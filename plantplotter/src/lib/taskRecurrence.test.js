import { describe, expect, it } from 'vitest';
import { getTaskRecurrenceLabel, getTaskRecurrencePayload, normalizeTaskRecurrence } from './taskRecurrence';
import { buildTaskCollections, getTaskUpdatePayload } from './trackerData';

describe('legacy recurrence compatibility', () => {
  it.each(['daily', 'every-2-days', 'weekly', 'monthly'])('preserves %s through fetch and update mapping', pattern => {
    const task = { id: 1, due_date: '2099-09-10', recurring_pattern: pattern, is_recurring: false };
    const loaded = buildTaskCollections([task]).upcomingTasks[0];
    expect(getTaskUpdatePayload(loaded)).toMatchObject({ is_recurring: true, recurring_pattern: pattern });
  });

  it.each(['seasonally', 'constructor', 'toString', '__proto__'])('retains unknown schedule %s and prevents a silent reset on save', pattern => {
    const task = { id: 1, due_date: '2099-09-10', recurring_pattern: pattern, is_recurring: true };
    const loaded = buildTaskCollections([task]).upcomingTasks[0];
    expect(loaded.recurring_pattern).toBe(pattern);
    expect(getTaskRecurrenceLabel(pattern)).toBe('Review schedule');
    expect(() => getTaskUpdatePayload(loaded)).toThrow('Choose a supported recurrence pattern, or select None.');
    expect(getTaskUpdatePayload({ ...loaded, recurring_pattern: 'none' })).toMatchObject({
      is_recurring: false, recurring_pattern: null
    });
  });

  it.each([undefined, null, '', 'none'])('preserves the non-recurring empty value %j', pattern => {
    expect(normalizeTaskRecurrence({ recurring_pattern: pattern })).toEqual({ isRecurring: false, recurringPattern: 'none' });
    expect(getTaskRecurrencePayload(pattern)).toEqual({ is_recurring: false, recurring_pattern: null });
  });
});
