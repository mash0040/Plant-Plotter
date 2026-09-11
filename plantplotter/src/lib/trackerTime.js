import { getTodayDateKey } from './trackerData';

export const getDefaultActivityTime = (date, now = new Date()) => (
  date === getTodayDateKey(now)
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    : ''
);

export const isValidActivityTime = (value) => (
  !value || /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)
);

export const getTimeSeconds = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap]m))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  if (Number(match[2]) > 59 || Number(match[3] || 0) > 59) return null;
  if (match[4]) {
    if (hours < 1 || hours > 12) return null;
    hours = hours % 12 + (match[4].toLowerCase() === 'pm' ? 12 : 0);
  } else if (hours > 23) return null;
  return hours * 3600 + Number(match[2]) * 60 + Number(match[3] || 0);
};

export const formatHistoryTime = (seconds) => {
  if (seconds === null) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
};
