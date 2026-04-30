const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/jwtSecret');
const { validatePassword } = require('../utils/passwordValidation');
const { validateEmail } = require('../utils/emailValidation');

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  const trimmedUsername = typeof username === 'string' ? username.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';

  // Check for missing fields
  if (!trimmedUsername || !trimmedEmail || !password) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }

  const emailError = validateEmail(trimmedEmail);
  if (emailError) {
    return res.status(400).json({ message: emailError });
  }

  // Password strength validation (must match frontend AuthForm rules)
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    // Email is the unique login identifier; display name (username column) is NOT unique.
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
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
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user in database
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptError) {
      console.error('Bcrypt comparison error:', bcryptError);
      return res.status(500).json({ message: 'Authentication error' });
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
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
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
