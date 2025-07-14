const db = require('../config/db');
const bcrypt = require('bcrypt');

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  // Check for missing fields
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }

  try {
    // Check if email already exists
    const [existing] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    await db.promise().query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const jwt = require('jsonwebtoken');

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create a token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    // Return token in response
    res.json({
      message: 'Login successful',
      token, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = {
  registerUser,
  loginUser,
};
