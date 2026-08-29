const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { validateEmail } = require('../utils/emailValidation');
const { sendDatabaseAwareErrorResponse } = require('../utils/databaseAvailability');
const { sendErrorResponse } = require('../utils/apiErrorResponse');

// GET /api/users/profile - Get user profile with preferences
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const db = require('../config/db');
    
    const [user] = await db.execute(
      'SELECT id, username, email, preferences, avatar, role, created_at FROM users WHERE id = ?',
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

    res.json(userData);
  } catch (error) {
    sendDatabaseAwareErrorResponse(res, error, { message: 'Server error' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    const db = require('../config/db');
    const trimmedUsername = typeof username === 'string' ? username.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';

    if (!trimmedUsername) {
      return sendErrorResponse(res, 400, 'Username is required', {
        code: 'VALIDATION_ERROR'
      });
    }

    if (!trimmedEmail) {
      return sendErrorResponse(res, 400, 'Email is required', {
        code: 'VALIDATION_ERROR'
      });
    }

    const emailError = validateEmail(trimmedEmail);
    if (emailError) {
      return sendErrorResponse(res, 400, emailError, {
        code: 'VALIDATION_ERROR'
      });
    }

    // Display name (username column) is NOT unique — duplicates are allowed.
    // Only email needs to be unique because it is the login identifier.
    // Check if email is already taken by another user
    const [existingEmail] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [trimmedEmail, req.user.id]
    );

    if (existingEmail.length > 0) {
      return sendErrorResponse(res, 409, 'Email already taken', {
        code: 'EMAIL_ALREADY_TAKEN'
      });
    }

    // Update both username and email
    await db.execute(
      'UPDATE users SET username = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [trimmedUsername, trimmedEmail, req.user.id]
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
    sendDatabaseAwareErrorResponse(res, error, { message: 'Server error' });
  }
});

// DELETE /api/users/account - Delete the authenticated user's own account
router.delete('/account', verifyToken, async (req, res) => {
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
      return sendErrorResponse(res, 404, 'User not found', {
        code: 'USER_NOT_FOUND'
      });
    }

    await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [req.user.id]
    );

    await connection.commit();
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

// PUT /api/users/preferences - Update user preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const preferences = req.body;
    const db = require('../config/db');

    // Validate preferences structure
    if (!preferences || typeof preferences !== 'object') {
      return sendErrorResponse(res, 400, 'Invalid preferences data', {
        code: 'VALIDATION_ERROR'
      });
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
      return sendErrorResponse(res, 404, 'User not found', {
        code: 'USER_NOT_FOUND'
      });
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
    sendDatabaseAwareErrorResponse(res, error, { message: 'Server error' });
  }
});

// GET /api/users/protected - Minimal protected route check
router.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: 'Authenticated'
  });
});

module.exports = router;
