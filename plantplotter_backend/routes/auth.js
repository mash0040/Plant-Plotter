const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.js');
const verifyToken = require('../middleware/verifyToken'); // Add this import

// POST /api/auth/login
router.post('/login', userController.loginUser);

// POST /api/auth/register  
router.post('/register', userController.registerUser);

// ADD THIS: Auth verification endpoint (missing from your current auth.js)
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

// Debug endpoint to check demo user and gardens
router.get('/debug/demo-user', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking demo user and gardens...');
    
    // Check demo user
    const [demoUser] = await db.execute(
      'SELECT id, email, username, role, is_active FROM users WHERE id = 1'
    );
    
    // Check demo user's gardens
    const [demoGardens] = await db.execute(
      `SELECT 
        g.id, g.name, g.user_id, g.plant_count, g.status,
        COUNT(pi.id) as actual_plant_count
       FROM gardens g 
       LEFT JOIN planted_items pi ON g.id = pi.garden_id
       WHERE g.user_id = 1 
       GROUP BY g.id`
    );
    
    // Check planted items
    const [plantedItems] = await db.execute(
      `SELECT pi.*, g.name as garden_name 
       FROM planted_items pi 
       JOIN gardens g ON pi.garden_id = g.id 
       WHERE g.user_id = 1`
    );
    
    res.json({
      message: 'Demo user debug info',
      demoUser: demoUser.length > 0 ? demoUser[0] : null,
      gardens: demoGardens,
      plantedItems: plantedItems,
      summary: {
        userExists: demoUser.length > 0,
        gardensCount: demoGardens.length,
        plantsCount: plantedItems.length
      }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug failed', message: error.message });
  }
});

// Fix demo user endpoint
router.post('/fix-demo-user', async (req, res) => {
  try {
    console.log('🔧 FIXING: Demo user setup...');
    
    // Ensure demo user exists
    await db.execute(`
      INSERT INTO users (id, email, username, password_hash, role, is_active, created_at, updated_at) 
      VALUES (1, 'demo@plantplotter.com', 'demo', '$2b$10$demohashedpassword', 'user', TRUE, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        email = 'demo@plantplotter.com',
        username = 'demo',
        is_active = TRUE,
        updated_at = NOW()
    `);
    
    // Clear existing demo gardens and plants
    await db.execute('DELETE FROM planted_items WHERE garden_id IN (SELECT id FROM gardens WHERE user_id = 1)');
    await db.execute('DELETE FROM gardens WHERE user_id = 1');
    
    // Create sample gardens
    const [vegGarden] = await db.execute(`
      INSERT INTO gardens (user_id, name, description, width, height, soil_type, location, status, plant_count, created_at, updated_at) 
      VALUES (1, 'Demo Vegetable Garden', 'A sample vegetable garden', 10, 8, 'Loamy', 'Backyard', 'Active', 0, NOW(), NOW())
    `);
    
    const [herbGarden] = await db.execute(`
      INSERT INTO gardens (user_id, name, description, width, height, soil_type, location, status, plant_count, created_at, updated_at) 
      VALUES (1, 'Demo Herb Garden', 'Small herb garden', 6, 4, 'Sandy', 'Kitchen Window', 'Active', 0, NOW(), NOW())
    `);
    
    // Add sample plants
    await db.execute(`
      INSERT INTO planted_items (garden_id, plant_id, plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, planted_date, created_at, updated_at) 
      VALUES 
      (?, 1, 'Tomato', '🍅', 2, 'vegetable', 2, 2, CURDATE(), NOW(), NOW()),
      (?, 2, 'Lettuce', '🥬', 1, 'vegetable', 5, 1, CURDATE(), NOW(), NOW()),
      (?, 3, 'Basil', '🌿', 1, 'herb', 1, 1, CURDATE(), NOW(), NOW())
    `, [vegGarden.insertId, vegGarden.insertId, herbGarden.insertId]);
    
    // Update plant counts
    await db.execute(`
      UPDATE gardens SET plant_count = (
        SELECT COUNT(*) FROM planted_items WHERE garden_id = gardens.id
      ) WHERE user_id = 1
    `);
    
    // Verify the fix
    const [verification] = await db.execute(`
      SELECT 
        u.id, u.email, 
        COUNT(DISTINCT g.id) as garden_count,
        COUNT(pi.id) as plant_count
      FROM users u 
      LEFT JOIN gardens g ON u.id = g.user_id 
      LEFT JOIN planted_items pi ON g.id = pi.garden_id 
      WHERE u.id = 1 
      GROUP BY u.id, u.email
    `);
        
    res.json({
      message: 'Demo user fixed successfully',
      verification: verification[0] || null,
      newGardenIds: [vegGarden.insertId, herbGarden.insertId]
    });
    
  } catch (error) {
    console.error('Fix failed:', error);
    res.status(500).json({ error: 'Fix failed', message: error.message });
  }
});

// Test demo login endpoint
router.post('/test-demo-login', async (req, res) => {
  try {    
    // Find demo user
    const [users] = await db.execute(
      'SELECT id, email, username, role FROM users WHERE email = ? AND is_active = TRUE',
      ['demo@plantplotter.com']
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Demo user not found' });
    }
    
    const user = users[0];
    
    // Generate token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'plantplotter_secret_key',
      { expiresIn: '24h' }
    );
    
    // Get user's gardens
    const [gardens] = await db.execute(
      'SELECT id, name, plant_count FROM gardens WHERE user_id = ?',
      [user.id]
    );
    
    res.json({
      message: 'Demo login test successful',
      token: token,
      user: user,
      gardens: gardens
    });
    
  } catch (error) {
    console.error('Demo login test failed:', error);
    res.status(500).json({ error: 'Demo login test failed', message: error.message });
  }
});

module.exports = router;