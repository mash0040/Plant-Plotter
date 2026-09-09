const RECURRENCE_PATTERNS = Object.freeze([
  'daily',
  'every-2-days',
  'weekly',
  'monthly'
]);

const RECURRENCE_INTERVAL_DAYS = {
  daily: 1,
  'every-2-days': 2,
  weekly: 7
};

const formatUtcDate = (date) => date.toISOString().slice(0, 10);

const parseDateKey = (value) => {
  const dateKey = value instanceof Date
    ? formatUtcDate(value)
    : String(value || '').split('T')[0];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return formatUtcDate(date) === dateKey ? date : null;
};

const validateTaskRecurrence = ({ isRecurring, recurringPattern }) => {
  const hasBooleanFlag = [true, false, 1, 0, undefined, null].includes(isRecurring);
  if (!hasBooleanFlag) {
    return {
      isValid: false,
      error: 'Recurring must be enabled or disabled.'
    };
  }

  const normalizedPattern = typeof recurringPattern === 'string'
    ? recurringPattern.trim()
    : recurringPattern;
  const hasNoPattern = normalizedPattern === undefined
    || normalizedPattern === null
    || normalizedPattern === ''
    || normalizedPattern === 'none';
  const isExplicitlyEnabled = isRecurring === true || isRecurring === 1;
  const isExplicitlyDisabled = isRecurring === false || isRecurring === 0;

  if (hasNoPattern) {
    if (isExplicitlyEnabled) {
      return {
        isValid: false,
        error: 'Select a recurrence pattern for recurring tasks.'
      };
    }

    return {
      isValid: true,
      isRecurring: false,
      recurringPattern: null
    };
  }

  if (!RECURRENCE_PATTERNS.includes(normalizedPattern)) {
    return {
      isValid: false,
      error: 'Recurrence pattern must be daily, every 2 days, weekly, or monthly.'
    };
  }

  if (isExplicitlyDisabled) {
    return {
      isValid: false,
      error: 'Disable the recurrence pattern before turning recurring tasks off.'
    };
  }

  return {
    isValid: true,
    isRecurring: true,
    recurringPattern: normalizedPattern
  };
};

const getMonthlyOccurrence = (dueDate, monthOffset) => {
  const targetMonthStart = new Date(Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth() + monthOffset,
    1
  ));
  const lastDayOfTargetMonth = new Date(Date.UTC(
    targetMonthStart.getUTCFullYear(),
    targetMonthStart.getUTCMonth() + 1,
    0
  )).getUTCDate();

  return new Date(Date.UTC(
    targetMonthStart.getUTCFullYear(),
    targetMonthStart.getUTCMonth(),
    Math.min(dueDate.getUTCDate(), lastDayOfTargetMonth)
  ));
};

const getNextOccurrenceDate = (dueDateValue, recurringPattern, referenceDate = new Date()) => {
  const dueDate = parseDateKey(dueDateValue);
  const reference = parseDateKey(referenceDate);

  if (!dueDate || !reference || !RECURRENCE_PATTERNS.includes(recurringPattern)) {
    return null;
  }

  if (recurringPattern === 'monthly') {
    const elapsedMonths = (
      (reference.getUTCFullYear() - dueDate.getUTCFullYear()) * 12
      + reference.getUTCMonth()
      - dueDate.getUTCMonth()
    );
    let monthOffset = Math.max(1, elapsedMonths);
    let nextOccurrence = getMonthlyOccurrence(dueDate, monthOffset);

    if (nextOccurrence <= reference) {
      monthOffset += 1;
      nextOccurrence = getMonthlyOccurrence(dueDate, monthOffset);
    }

    return formatUtcDate(nextOccurrence);
  }

  const intervalDays = RECURRENCE_INTERVAL_DAYS[recurringPattern];
  const elapsedDays = Math.floor((reference - dueDate) / 86400000);
  const intervalCount = Math.max(1, Math.floor(elapsedDays / intervalDays) + 1);
  const nextOccurrence = new Date(dueDate);
  nextOccurrence.setUTCDate(dueDate.getUTCDate() + intervalCount * intervalDays);

  return formatUtcDate(nextOccurrence);
};

const shouldScheduleNextOccurrence = ({ previousStatus, nextStatus, isRecurring }) => (
  previousStatus !== 'completed' && nextStatus === 'completed' && isRecurring === true
);

module.exports = {
  RECURRENCE_PATTERNS,
  getNextOccurrenceDate,
  shouldScheduleNextOccurrence,
  validateTaskRecurrence
};
