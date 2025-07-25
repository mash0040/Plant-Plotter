const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

// GET /api/users/profile - Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const db = require('../config/db');
    // Use 'username' field to match your updated database schema
    const [user] = await db.execute(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { username } = req.body;
    const db = require('../config/db');

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Check if username is already taken by another user
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    // Update username field
    await db.execute(
      'UPDATE users SET username = ?, updated_at = NOW() WHERE id = ?',
      [username, req.user.id]
    );

    // Return updated user
    const [updatedUser] = await db.execute(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/protected - Test protected route
router.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: '🔐 You accessed a protected route!',
    user: req.user
  });
});

module.exports = router;