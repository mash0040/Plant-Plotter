const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RECURRENCE_PATTERNS,
  getNextOccurrenceDate,
  shouldScheduleNextOccurrence,
  validateTaskRecurrence
} = require('../utils/taskRecurrence');

test('supports every recurrence shown by the task editor', () => {
  assert.deepEqual(RECURRENCE_PATTERNS, [
    'daily',
    'every-2-days',
    'weekly',
    'monthly'
  ]);
});

test('normalizes non-recurring and legacy pattern-only payloads', () => {
  assert.deepEqual(validateTaskRecurrence({
    isRecurring: false,
    recurringPattern: null
  }), {
    isValid: true,
    isRecurring: false,
    recurringPattern: null
  });

  assert.deepEqual(validateTaskRecurrence({
    recurringPattern: 'every-2-days'
  }), {
    isValid: true,
    isRecurring: true,
    recurringPattern: 'every-2-days'
  });
});

test('rejects contradictory and unsupported recurrence values', () => {
  assert.equal(validateTaskRecurrence({
    isRecurring: false,
    recurringPattern: 'weekly'
  }).isValid, false);
  assert.equal(validateTaskRecurrence({
    isRecurring: true,
    recurringPattern: null
  }).isValid, false);
  assert.equal(validateTaskRecurrence({
    isRecurring: true,
    recurringPattern: 'yearly'
  }).isValid, false);
});

test('advances daily and weekly schedules beyond the completion date', () => {
  assert.equal(
    getNextOccurrenceDate('2026-09-09', 'daily', '2026-09-09'),
    '2026-09-10'
  );
  assert.equal(
    getNextOccurrenceDate('2026-08-26', 'weekly', '2026-09-09'),
    '2026-09-16'
  );
});

test('preserves the cadence of legacy every-2-days tasks', () => {
  assert.equal(
    getNextOccurrenceDate('2026-09-01', 'every-2-days', '2026-09-09'),
    '2026-09-11'
  );
});

test('clamps monthly schedules to the last valid calendar day', () => {
  assert.equal(
    getNextOccurrenceDate('2028-01-31', 'monthly', '2028-01-31'),
    '2028-02-29'
  );
  assert.equal(
    getNextOccurrenceDate('2028-01-31', 'monthly', '2028-02-29'),
    '2028-03-31'
  );
});

test('schedules only the first completed transition for a recurring task', () => {
  assert.equal(shouldScheduleNextOccurrence({
    previousStatus: 'pending',
    nextStatus: 'completed',
    isRecurring: true
  }), true);
  assert.equal(shouldScheduleNextOccurrence({
    previousStatus: 'completed',
    nextStatus: 'completed',
    isRecurring: true
  }), false);
  assert.equal(shouldScheduleNextOccurrence({
    previousStatus: 'pending',
    nextStatus: 'completed',
    isRecurring: false
  }), false);
});
