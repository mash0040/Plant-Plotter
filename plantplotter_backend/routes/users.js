const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const requireMutableAccount = require('../middleware/requireMutableAccount');
const { isProtectedDemoAccount } = require('../utils/protectedDemoAccount');
const { sendDatabaseAwareErrorResponse } = require('../utils/databaseAvailability');
const { sendErrorResponse } = require('../utils/apiErrorResponse');
const { clearAuthCookie } = require('../utils/authCookie');

// GET /api/users/profile - Get user profile with preferences
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const db = require('../config/db');
    
    const [user] = await db.execute(
      'SELECT id, username, email, preferences, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.length === 0) {
      return sendErrorResponse(res, 404, 'User not found', {
        code: 'USER_NOT_FOUND'
      });
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

    res.json({ ...userData, isProtectedDemo: isProtectedDemoAccount(userData) });
  } catch (error) {
    sendDatabaseAwareErrorResponse(res, error, { message: 'Server error' });
  }
});

// PUT /api/users/profile - Update the display name; account email is read-only
router.put('/profile', verifyToken, requireMutableAccount, async (req, res) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'email')) {
      return sendErrorResponse(res, 400, 'Email cannot be changed in profile settings.', {
        code: 'EMAIL_READ_ONLY'
      });
    }

    const { username } = req.body ?? {};
    const db = require('../config/db');
    const trimmedUsername = typeof username === 'string' ? username.trim() : '';

    if (!trimmedUsername) {
      return sendErrorResponse(res, 400, 'Username is required', {
        code: 'VALIDATION_ERROR'
      });
    }

    // Display names do not need to be unique.
    await db.execute(
      'UPDATE users SET username = ?, updated_at = NOW() WHERE id = ?',
      [trimmedUsername, req.user.id]
    );

    // Return updated user with preferences
    const [updatedUser] = await db.execute(
      'SELECT id, username, email, preferences, avatar, created_at FROM users WHERE id = ?',
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
      user: { ...userData, isProtectedDemo: isProtectedDemoAccount(userData) }
    });

  } catch (error) {
    sendDatabaseAwareErrorResponse(res, error, { message: 'Server error' });
  }
});

// DELETE /api/users/account - Delete the authenticated user's own account
router.delete('/account', verifyToken, requireMutableAccount, async (req, res) => {
  const db = require('../config/db');
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [user] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.length === 0) {
      await connection.rollback();
      clearAuthCookie(res);
      return sendErrorResponse(res, 404, 'User not found', {
        code: 'USER_NOT_FOUND'
      });
    }

    await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [req.user.id]
    );

    await connection.commit();
    clearAuthCookie(res);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Account deletion rollback error:', rollbackError.message);
      }
    }
    console.error('Account deletion error:', error);
    sendDatabaseAwareErrorResponse(res, error, { message: 'Failed to delete account' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// GET /api/users/protected - Minimal protected route check
router.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: 'Authenticated'
  });
});

module.exports = router;
