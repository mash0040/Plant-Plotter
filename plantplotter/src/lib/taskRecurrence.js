export const TASK_RECURRENCE_OPTIONS = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'every-2-days', label: 'Every 2 days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
]);

const TASK_RECURRENCE_LABELS = Object.fromEntries(
  TASK_RECURRENCE_OPTIONS.map(({ value, label }) => [value, label])
);

export const isSupportedTaskRecurrence = pattern => (
  TASK_RECURRENCE_OPTIONS.some(option => option.value === pattern)
);

export const normalizeTaskRecurrence = (task = {}) => {
  // Keep unknown saved schedules visible so editing cannot silently disable them.
  const recurringPattern = task.recurring_pattern ?? task.recurringPattern ?? 'none';
  const normalizedPattern = recurringPattern === '' ? 'none' : recurringPattern;

  return {
    isRecurring: normalizedPattern !== 'none',
    recurringPattern: normalizedPattern
  };
};

export const getTaskRecurrencePayload = (recurringPattern = 'none') => {
  const normalizedPattern = recurringPattern == null || recurringPattern === '' ? 'none' : recurringPattern;
  if (!isSupportedTaskRecurrence(normalizedPattern)) {
    throw new Error('Choose a supported recurrence pattern, or select None.');
  }

  return {
    is_recurring: normalizedPattern !== 'none',
    recurring_pattern: normalizedPattern === 'none' ? null : normalizedPattern
  };
};

export const getTaskRecurrenceLabel = (recurringPattern) => (
  isSupportedTaskRecurrence(recurringPattern) ? TASK_RECURRENCE_LABELS[recurringPattern] : 'Review schedule'
);
