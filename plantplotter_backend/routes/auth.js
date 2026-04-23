const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.js');
const verifyToken = require('../middleware/verifyToken');

// POST /api/auth/login
router.post('/login', userController.loginUser);

// POST /api/auth/register  
router.post('/register', userController.registerUser);

// Auth verification endpoint
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username || req.user.name,
      role: req.user.role || 'user'
    }
  });
});

module.exports = router;