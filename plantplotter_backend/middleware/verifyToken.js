const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../config/jwtSecret');
const { sendErrorResponse } = require('../utils/apiErrorResponse');

const verifyToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return sendErrorResponse(res, 401, 'Access denied. No token provided.', {
        code: 'NO_AUTH_HEADER'
      });
    }

    // Extract token from "Bearer TOKEN" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return sendErrorResponse(res, 401, 'Access denied. Invalid token format.', {
        code: 'INVALID_TOKEN_FORMAT'
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
    
    if (error.name === 'JsonWebTokenError') {
      return sendErrorResponse(res, 401, 'Invalid token.', {
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return sendErrorResponse(res, 401, 'Token expired.', {
        code: 'TOKEN_EXPIRED'
      });
    }

    return sendErrorResponse(res, 500, 'Token verification failed.');
  }
};

module.exports = verifyToken;
