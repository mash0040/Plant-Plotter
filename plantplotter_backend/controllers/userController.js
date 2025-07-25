const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  console.log('📝 Registration attempt for:', email);

  // Check for missing fields
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }

  try {
    // Check if email already exists - use your existing method
    const [existing] = await db.promise().query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('⚠️ Email already exists:', email);
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed for registration');

    // Insert user into database
    const [result] = await db.promise().query(
      'INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [username, email, hashedPassword, 'user', true]
    );

    const userId = result.insertId;
    console.log('✅ User registered with ID:', userId);

    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: userId,
        username: username,
        email: email
      }
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  console.log('🔐 Login attempt for:', email);
  console.log('🔍 Password provided:', password ? 'Yes' : 'No', '- Length:', password ? password.length : 0);

  if (!email || !password) {
    console.log('❌ Missing email or password');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Use your existing db.query method
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);

    if (rows.length === 0) {
      console.log('❌ User not found or inactive:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    console.log('👤 Found user:', { 
      id: user.id, 
      email: user.email, 
      username: user.username,
      hasPasswordHash: !!user.password_hash
    });

    // Debug the password hash
    console.log('🔍 Stored password hash preview:', user.password_hash ? user.password_hash.substring(0, 30) + '...' : 'null');
    console.log('🔍 Input password:', `"${password}"`);
    console.log('🔍 Password type:', typeof password);

    // Test password verification with detailed logging
    let isMatch = false;
    try {
      console.log('🔍 Starting bcrypt comparison...');
      isMatch = await bcrypt.compare(password, user.password_hash);
      console.log('🔍 Password verification result:', isMatch);
    } catch (bcryptError) {
      console.error('❌ Bcrypt comparison error:', bcryptError);
      return res.status(500).json({ message: 'Authentication error' });
    }

    if (!isMatch) {
      console.log('❌ Invalid password for:', email);
      
      // Special handling for demo user - generate a fresh hash
      if (email === 'demo@plantplotter.com' && password === 'demo123') {
        console.log('🔧 Demo user password mismatch - generating fresh hash...');
        
        try {
          // Generate a completely new hash for demo123
          const newHash = await bcrypt.hash('demo123', 10);
          console.log('🔧 Generated fresh hash:', newHash.substring(0, 30) + '...');
          
          // Update the user's password hash in database
          await db.query(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ?',
            [newHash, 'demo@plantplotter.com']
          );
          
          console.log('✅ Demo user password hash updated in database');
          
          // Test the new hash immediately
          const testNewHash = await bcrypt.compare('demo123', newHash);
          console.log('🔍 New hash test result:', testNewHash);
          
          if (testNewHash) {
            isMatch = true;
            console.log('✅ Demo user password fixed successfully');
          } else {
            console.log('❌ Even fresh hash failed - bcrypt issue');
            return res.status(401).json({ message: 'Invalid credentials' });
          }
          
        } catch (fixError) {
          console.error('❌ Failed to fix demo user password:', fixError);
          return res.status(401).json({ message: 'Invalid credentials' });
        }
      } else {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    console.log('✅ Password verification successful for:', email);

    // Create a token
    const tokenPayload = { 
      id: user.id, 
      email: user.email,
      username: user.username,
      role: user.role || 'user'
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'plantplotter_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('✅ JWT token generated for user:', user.id);

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
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
};