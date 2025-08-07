// Simple verifyToken.js - No special demo handling
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.log('No Authorization header found');
      return res.status(401).json({ 
        message: 'Access denied. No token provided.',
        error: 'NO_AUTH_HEADER'
      });
    }

    // Extract token from "Bearer TOKEN" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      console.log('No token found in Authorization header');
      return res.status(401).json({ 
        message: 'Access denied. Invalid token format.',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'plantplotter_secret_key');
    
    if (!decoded.id) {
      console.log('Token missing user ID');
      return res.status(401).json({ 
        message: 'Invalid token. User ID missing.',
        error: 'MISSING_USER_ID'
      });
    }

    // Ensure user ID is a number
    const userId = parseInt(decoded.id);
    
    if (isNaN(userId)) {
      console.log('Invalid user ID format:', decoded.id);
      return res.status(401).json({ 
        message: 'Invalid token. User ID format invalid.',
        error: 'INVALID_USER_ID_FORMAT'
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
      return res.status(401).json({ 
        message: 'Invalid token.',
        error: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired.',
        error: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({ 
      message: 'Token verification failed.',
      error: error.message
    });
  }
};

module.exports = verifyToken;