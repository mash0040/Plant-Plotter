const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/jwtSecret');
const db = require('../config/db');
const { sendErrorResponse } = require('../utils/apiErrorResponse');
const { sendDatabaseAwareErrorResponse } = require('../utils/databaseAvailability');
const { clearAuthCookie, getAuthCookieName } = require('../utils/authCookie');

const verifyToken = async (req, res, next) => {
  let decoded;
  try {
    const token = req.cookies?.[getAuthCookieName()];
    
    if (!token) {
      return sendErrorResponse(res, 401, 'Please sign in to continue.', {
        code: 'AUTH_REQUIRED'
      });
    }

    // Verify the token
    decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.id) {
      clearAuthCookie(res);
      return sendErrorResponse(res, 401, 'Invalid token. User ID missing.', {
        code: 'MISSING_USER_ID'
      });
    }

    // Ensure user ID is a number
    const userId = parseInt(decoded.id);
    
    if (isNaN(userId)) {
      clearAuthCookie(res);
      return sendErrorResponse(res, 401, 'Invalid token. User ID format invalid.', {
        code: 'INVALID_USER_ID_FORMAT'
      });
    }

  } catch (error) {
    console.error('Token verification failed:', error.message);
    clearAuthCookie(res);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return sendErrorResponse(res, 401, 'Your session is invalid. Please sign in again.', {
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return sendErrorResponse(res, 401, 'Your session expired. Please sign in again.', {
        code: 'TOKEN_EXPIRED'
      });
    }

    return sendErrorResponse(res, 500, 'Token verification failed.');
  }

  // Legacy cookies have no version and must authenticate again after deployment.
  if (!Number.isSafeInteger(decoded.sessionVersion) || decoded.sessionVersion < 0) {
    clearAuthCookie(res);
    return sendErrorResponse(res, 401, 'Your session is invalid. Please sign in again.', {
      code: 'INVALID_TOKEN'
    });
  }

  const userId = parseInt(decoded.id);
  let users;
  try {
    [users] = await db.execute(
      'SELECT session_version FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );
  } catch (error) {
    // A failed lookup must deny access without treating an outage as a logout.
    return sendDatabaseAwareErrorResponse(res, error, { message: 'Unable to verify your session. Please try again.' });
  }

  if (users.length !== 1 || users[0].session_version !== decoded.sessionVersion) {
    clearAuthCookie(res);
    return sendErrorResponse(res, 401, 'Your session is invalid. Please sign in again.', {
      code: 'INVALID_TOKEN'
    });
  }

  req.user = {
    id: userId,
    email: decoded.email,
    username: decoded.username
  };
  next();
};

module.exports = verifyToken;
