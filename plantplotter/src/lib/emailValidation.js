export const EMAIL_VALIDATION_MESSAGE = 'Enter a valid email address, such as name@example.com.';

export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;

  const value = email.trim();
  if (!value || /\s/.test(value)) return false;

  const parts = value.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (!localPart || !domain) return false;
  if (!domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;

  const domainParts = domain.split('.');
  if (domainParts.some(part => !part)) return false;

  const extension = domainParts[domainParts.length - 1];
  return /^[A-Za-z]{2,}$/.test(extension);
};

export const validateEmail = (email) => {
  if (typeof email !== 'string' || !email.trim()) {
    return 'Email is required';
  }

  return isValidEmail(email) ? '' : EMAIL_VALIDATION_MESSAGE;
};
