// Shared password strength rules used by registration and any future password-change flow.
// Rules MUST stay in sync with the frontend AuthForm validator.
const MIN_LENGTH = 8;

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required';
  }
  if (password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters long`;
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
  validatePassword
};
