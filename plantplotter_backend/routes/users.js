const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

// GET /api/users/profile - Get user profile with preferences
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const db = require('../config/db');
    
    const [user] = await db.execute(
      'SELECT id, username, email, preferences, avatar, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user[0];
    
    // Parse preferences if they exist as string
    if (userData.preferences && typeof userData.preferences === 'string') {
      try {
        userData.preferences = JSON.parse(userData.preferences);
      } catch (parseError) {
        userData.preferences = null;
      }
    }

    res.json(userData);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    const db = require('../config/db');

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email' });
    }

    // Check if username is already taken by another user
    const [existingUsername] = await db.execute(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, req.user.id]
    );

    if (existingUsername.length > 0) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    // Check if email is already taken by another user
    const [existingEmail] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.user.id]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({ message: 'Email already taken' });
    }

    // Update both username and email
    await db.execute(
      'UPDATE users SET username = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [username, email, req.user.id]
    );

    // Return updated user with preferences
    const [updatedUser] = await db.execute(
      'SELECT id, username, email, preferences, avatar, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    const userData = updatedUser[0];
    
    // Parse preferences for response
    if (userData.preferences && typeof userData.preferences === 'string') {
      try {
        userData.preferences = JSON.parse(userData.preferences);
      } catch (parseError) {
        userData.preferences = null;
      }
    }

    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/preferences - Update user preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const preferences = req.body;
    const db = require('../config/db');

    // Validate preferences structure
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ message: 'Invalid preferences data' });
    }

    // Convert preferences to JSON string for storage
    const preferencesJson = JSON.stringify(preferences);

    // Update preferences in database
    await db.execute(
      'UPDATE users SET preferences = ?, updated_at = NOW() WHERE id = ?',
      [preferencesJson, req.user.id]
    );

    // Return updated user data with all fields
    const [updatedUser] = await db.execute(
      'SELECT id, username, email, avatar, preferences, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (updatedUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Parse preferences for response
    const userData = updatedUser[0];
    if (userData.preferences && typeof userData.preferences === 'string') {
      try {
        userData.preferences = JSON.parse(userData.preferences);
      } catch (parseError) {
        userData.preferences = preferences; // fallback to input data
      }
    }
    
    res.json({
      message: 'Preferences updated successfully',
      user: userData
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/protected - Test protected route
router.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: 'You accessed a protected route!',
    user: req.user
  });
});

module.exports = router;