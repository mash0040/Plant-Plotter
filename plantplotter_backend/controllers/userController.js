const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/jwtSecret');
const { validatePassword } = require('../utils/passwordValidation');
const { validateEmail } = require('../utils/emailValidation');
const { requestPasswordReset, resetPassword } = require('../utils/passwordResetService');
const { sendDatabaseAwareErrorResponse } = require('../utils/databaseAvailability');
const { sendErrorResponse } = require('../utils/apiErrorResponse');

const normalizeEmail = (email) => (
  typeof email === 'string' ? email.trim().toLowerCase() : ''
);

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  const trimmedUsername = typeof username === 'string' ? username.trim() : '';
  const trimmedEmail = normalizeEmail(email);

  // Check for missing fields
  if (!trimmedUsername || !trimmedEmail || !password) {
    return sendErrorResponse(res, 400, 'Please fill in all fields', {
      code: 'VALIDATION_ERROR'
    });
  }

  const emailError = validateEmail(trimmedEmail);
  if (emailError) {
    return sendErrorResponse(res, 400, emailError, {
      code: 'VALIDATION_ERROR'
    });
  }

  // Password strength validation (must match frontend AuthForm rules)
  const passwordError = validatePassword(password);
  if (passwordError) {
    return sendErrorResponse(res, 400, passwordError, {
      code: 'VALIDATION_ERROR'
    });
  }

  try {
    // Email is the unique login identifier; display name (username column) is NOT unique.
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return sendErrorResponse(res, 409, 'Email already registered', {
        code: 'EMAIL_ALREADY_REGISTERED'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [trimmedUsername, trimmedEmail, hashedPassword, 'user', true]
    );

    const userId = result.insertId;

    // Generate JWT token for immediate login
    const tokenPayload = { 
      id: userId, 
      email: trimmedEmail,
      username: trimmedUsername,
      role: 'user'
    };

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return success with token (for immediate login)
    res.status(201).json({ 
      message: 'User registered successfully',
      token: token,
      user: {
        id: userId,
        username: trimmedUsername,
        email: trimmedEmail,
        role: 'user'
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    sendDatabaseAwareErrorResponse(res, err, { message: 'Server error' });
  }
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
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [trimmedEmail]);

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

    // Create a token
    const tokenPayload = { 
      id: user.id, 
      email: user.email,
      username: user.username,
      role: user.role || 'user'
    };

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return token in response
    res.json({
      message: 'Login successful',
      token, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
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

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetUserPassword
};
