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

export const normalizeTaskRecurrence = (task = {}) => {
  const rawPattern = task.recurring_pattern || task.recurringPattern || 'none';
  const recurringPattern = TASK_RECURRENCE_LABELS[rawPattern] ? rawPattern : 'none';

  return {
    isRecurring: recurringPattern !== 'none',
    recurringPattern
  };
};

export const getTaskRecurrencePayload = (recurringPattern = 'none') => {
  const normalizedPattern = TASK_RECURRENCE_LABELS[recurringPattern]
    ? recurringPattern
    : 'none';

  return {
    is_recurring: normalizedPattern !== 'none',
    recurring_pattern: normalizedPattern === 'none' ? null : normalizedPattern
  };
};

export const getTaskRecurrenceLabel = (recurringPattern) => (
  TASK_RECURRENCE_LABELS[recurringPattern] || 'Not recurring'
);
