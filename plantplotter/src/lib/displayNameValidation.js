// Mirror the backend display-name policy; boundary tests guard against drift.
export const MIN_DISPLAY_NAME_LENGTH = 2;
export const MAX_DISPLAY_NAME_LENGTH = 30;
export const DISPLAY_NAME_RULES_HINT = `${MIN_DISPLAY_NAME_LENGTH}–${MAX_DISPLAY_NAME_LENGTH} characters.`;

// Native maxLength counts untrimmed UTF-16 units, so it cannot express this rule.
export const validateDisplayName = (name) => {
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
