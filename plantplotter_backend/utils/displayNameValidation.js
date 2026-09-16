const MIN_DISPLAY_NAME_LENGTH = 2;
const MAX_DISPLAY_NAME_LENGTH = 30;

// Registration and profile updates accept 2–30 trimmed Unicode code points.
const validateDisplayName = (name) => {
  const value = typeof name === 'string' ? name.trim() : '';
  const length = Array.from(value).length;
  if (length === 0) return 'Display name is required';
  if (length < MIN_DISPLAY_NAME_LENGTH) {
    return `Display name must be at least ${MIN_DISPLAY_NAME_LENGTH} characters`;
  }
  if (length > MAX_DISPLAY_NAME_LENGTH) {
    return `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`;
  }
  return null;
};

module.exports = { MIN_DISPLAY_NAME_LENGTH, MAX_DISPLAY_NAME_LENGTH, validateDisplayName };
