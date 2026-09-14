// Shared password strength rules used by registration and any future password-change flow.
// Rules MUST stay in sync with plantplotter/src/lib/passwordValidation.js.
const MIN_LENGTH = 8;
const MAX_BYTES = 72;

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required';
  }
  if (password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters long`;
  }
  // bcrypt only processes the first 72 UTF-8 bytes. Reject, never truncate.
  if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) {
    return `Password is too long. Use no more than ${MAX_BYTES} UTF-8 bytes; accented letters and emoji can use multiple bytes.`;
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
};

module.exports = {
  MIN_LENGTH,
  MAX_BYTES,
  validatePassword
};
