const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/jwtSecret');
const { validatePassword } = require('../utils/passwordValidation');
const { validateEmail } = require('../utils/emailValidation');
const { validateDisplayName } = require('../utils/displayNameValidation');
const { requestPasswordReset, resetPassword } = require('../utils/passwordResetService');
const { sendDatabaseAwareErrorResponse } = require('../utils/databaseAvailability');
const { sendErrorResponse } = require('../utils/apiErrorResponse');
const { clearAuthCookie, setAuthCookie, clearSignupCookie } = require('../utils/authCookie');
const { isProtectedDemoAccount } = require('../utils/protectedDemoAccount');

const normalizeEmail = (email) => (
  typeof email === 'string' ? email.trim().toLowerCase() : ''
);

const registerUser = async (req, res) => {
  const { username, email, password } = req.body || {};
  const trimmedEmail = normalizeEmail(email);

  const displayNameError = validateDisplayName(username);
  if (displayNameError) {
    return sendErrorResponse(res, 400, displayNameError, {
      code: 'VALIDATION_ERROR', errors: { username: displayNameError }
    });
  }

  const emailError = validateEmail(trimmedEmail);
  if (emailError) {
    return sendErrorResponse(res, 400, emailError, {
      code: 'VALIDATION_ERROR', errors: { email: emailError }
    });
  }

  // Password strength validation (must match frontend AuthForm rules)
  const passwordError = validatePassword(password);
  if (passwordError) {
    return sendErrorResponse(res, 400, passwordError, {
      code: 'VALIDATION_ERROR', errors: { password: passwordError }
    });
  }

  return require('./signupController').startSignup(req, res);
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = normalizeEmail(email);

  if (!trimmedEmail || !password) {
    return sendErrorResponse(res, 400, 'Email and password are required', {
      code: 'VALIDATION_ERROR'
    });
  }

  try {
    // Find user in database
    const [rows] = await db.execute('SELECT id, email, username, password_hash, session_version FROM users WHERE email = ? AND is_active = TRUE', [trimmedEmail]);

    if (rows.length === 0) {
      return sendErrorResponse(res, 401, 'Invalid credentials', {
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = rows[0];

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptError) {
      console.error('Bcrypt comparison error:', bcryptError);
      return sendErrorResponse(res, 500, 'Authentication error');
    }

    if (!isMatch) {
      return sendErrorResponse(res, 401, 'Invalid credentials', {
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate the JWT stored in the httpOnly session cookie.
    const tokenPayload = { 
      id: user.id, 
      email: user.email,
      username: user.username,
      sessionVersion: user.session_version
    };

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    setAuthCookie(res, token);
    clearSignupCookie(res);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isProtectedDemo: isProtectedDemoAccount(user)
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    sendDatabaseAwareErrorResponse(res, err, { message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const result = await requestPasswordReset({
      db,
      email: req.body?.email
    });

    res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    sendDatabaseAwareErrorResponse(res, error, { message: 'Server error' });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const result = await resetPassword({
      db,
      token: req.body?.token,
      password: req.body?.password,
      confirmPassword: req.body?.confirmPassword
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Reset password error:', error);
    sendDatabaseAwareErrorResponse(res, error, { message: 'Server error' });
  }
};

const logoutUser = (req, res) => {
  clearAuthCookie(res);
  clearSignupCookie(res);
  res.json({ message: 'Signed out successfully' });
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetUserPassword
};
