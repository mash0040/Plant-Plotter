const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { validatePassword } = require('./passwordValidation');
const { validateEmail } = require('./emailValidation');
const { sendPasswordResetEmail } = require('./emailService');

const PASSWORD_RESET_SUCCESS_MESSAGE = 'If an account exists, we sent password reset instructions.';
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MINUTES = 30;

const normalizeEmail = (email) => (
  typeof email === 'string' ? email.trim().toLowerCase() : ''
);

const hashResetToken = (token) => (
  crypto.createHash('sha256').update(token).digest('hex')
);

const generateResetToken = () => (
  crypto.randomBytes(RESET_TOKEN_BYTES).toString('base64url')
);

const getPasswordResetBaseUrl = () => {
  const baseUrl = (process.env.PASSWORD_RESET_BASE_URL || '').trim();
  if (!baseUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PASSWORD_RESET_BASE_URL is required in production');
    }
    return 'http://localhost:3000/reset-password';
  }

  if (process.env.NODE_ENV === 'production' && !baseUrl.startsWith('https://')) {
    throw new Error('PASSWORD_RESET_BASE_URL must use HTTPS in production');
  }

  return baseUrl;
};

const buildPasswordResetUrl = (token) => {
  const resetUrl = new URL(getPasswordResetBaseUrl());
  resetUrl.searchParams.set('token', token);
  return resetUrl.toString();
};

const requestPasswordReset = async ({
  db,
  email,
  sendEmail = sendPasswordResetEmail,
  generateToken = generateResetToken,
  now = () => new Date()
}) => {
  const normalizedEmail = normalizeEmail(email);
  const emailError = validateEmail(normalizedEmail);

  if (emailError) {
    return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  const [users] = await db.execute(
    'SELECT id, email FROM users WHERE email = ? AND is_active = TRUE',
    [normalizedEmail]
  );

  if (users.length === 0) {
    return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  const token = generateToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(now().getTime() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
  const resetUrl = buildPasswordResetUrl(token);

  await db.execute(
    `UPDATE users
     SET reset_password_token_hash = ?, reset_password_expires = ?, updated_at = NOW()
     WHERE id = ?`,
    [tokenHash, expiresAt, users[0].id]
  );

  try {
    await sendEmail({ to: users[0].email, resetUrl });
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Password reset email configuration/send error:', error.message);
    } else {
      console.error('Password reset email error:', error.message);
    }
  }

  return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
};

const resetPassword = async ({ db, token, password, confirmPassword, now = () => new Date() }) => {
  if (!token || typeof token !== 'string') {
    return { status: 400, body: { message: 'Password reset link is invalid or expired.' } };
  }

  if (password !== confirmPassword) {
    return { status: 400, body: { message: 'Passwords do not match' } };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { status: 400, body: { message: passwordError } };
  }

  const tokenHash = hashResetToken(token);
  const [users] = await db.execute(
    `SELECT id, reset_password_expires
     FROM users
     WHERE reset_password_token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );

  if (users.length === 0) {
    return { status: 400, body: { message: 'Password reset link is invalid or expired.' } };
  }

  const expiresAt = new Date(users[0].reset_password_expires);
  if (!users[0].reset_password_expires || expiresAt <= now()) {
    return { status: 400, body: { message: 'Password reset link is invalid or expired.' } };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await db.execute(
    `UPDATE users
     SET password_hash = ?,
         reset_password_token_hash = NULL,
         reset_password_expires = NULL,
         updated_at = NOW()
     WHERE id = ?`,
    [hashedPassword, users[0].id]
  );

  return { status: 200, body: { message: 'Password reset successfully. You can now sign in.' } };
};

module.exports = {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  buildPasswordResetUrl,
  generateResetToken,
  hashResetToken,
  normalizeEmail,
  requestPasswordReset,
  resetPassword
};
