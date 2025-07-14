const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users/register
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

module.exports = router;


const verifyToken = require('../middleware/verifyToken');

router.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: '🔐 You accessed a protected route!',
    user: req.user
  });
});