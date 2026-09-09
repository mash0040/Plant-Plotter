const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/jwtSecret');
const { sendErrorResponse } = require('../utils/apiErrorResponse');
const { clearAuthCookie, getAuthCookieName } = require('../utils/authCookie');

const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies?.[getAuthCookieName()];
    
    if (!token) {
      return sendErrorResponse(res, 401, 'Please sign in to continue.', {
        code: 'AUTH_REQUIRED'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded.id) {
      return sendErrorResponse(res, 401, 'Invalid token. User ID missing.', {
        code: 'MISSING_USER_ID'
      });
    }

    // Ensure user ID is a number
    const userId = parseInt(decoded.id);
    
    if (isNaN(userId)) {
      return sendErrorResponse(res, 401, 'Invalid token. User ID format invalid.', {
        code: 'INVALID_USER_ID_FORMAT'
      });
    }

    // Add user info to request object
    req.user = {
      id: userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role || 'user'
    };

    next();

  } catch (error) {
    console.error('Token verification failed:', error.message);
    clearAuthCookie(res);
    
    if (error.name === 'JsonWebTokenError') {
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
};

module.exports = verifyToken;
