// Password rules for registration and password reset/change. Keep in sync with
// plantplotter_backend/utils/passwordValidation.js — both must accept/reject
// the same inputs so backend and frontend never disagree.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  }
  // Match Node's UTF-8 byte count, including multibyte Unicode input.
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return 'Password is too long. Try a shorter password.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

export const PASSWORD_RULES_HINT = `At least ${PASSWORD_MIN_LENGTH} characters, including uppercase and lowercase letters and a number.`;
