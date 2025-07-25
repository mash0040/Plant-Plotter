const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

// GET /api/activities
router.get('/', verifyToken, async (req, res) => {
  try {
    const { gardenId, date } = req.query;
    let query = `
      SELECT a.*, g.name as garden_name 
      FROM activities a 
      LEFT JOIN gardens g ON a.garden_id = g.id 
      WHERE a.user_id = ?
    `;
    const params = [req.user.id];

    if (gardenId) {
      query += ' AND a.garden_id = ?';
      params.push(gardenId);
    }

    if (date) {
      query += ' AND DATE(a.activity_date) = ?';
      params.push(date);
    }

    query += ' ORDER BY a.activity_date DESC';

    const [activities] = await db.execute(query, params);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// POST /api/activities
router.post('/', verifyToken, async (req, res) => {
  try {
    const { garden_id, activity_type, plant_name, notes, activity_date } = req.body;
    
    const [result] = await db.execute(
      `INSERT INTO activities (user_id, garden_id, activity_type, plant_name, notes, activity_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, garden_id, activity_type, plant_name, notes, activity_date || new Date()]
    );

    const [newActivity] = await db.execute(
      'SELECT * FROM activities WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newActivity[0]);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

module.exports = router;