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
      FROM garden_activities a 
      LEFT JOIN gardens g ON a.garden_id = g.id 
      WHERE a.user_id = ?
    `;
    const params = [req.user.id];

    if (gardenId) {
      query += ' AND a.garden_id = ?';
      params.push(gardenId);
    }

    if (date) {
      query += ' AND a.activity_date = ?';
      params.push(date);
    }

    query += ' ORDER BY a.activity_date DESC, a.activity_time DESC';

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
    
    // Validate required fields
    if (!garden_id || !activity_type) {
      return res.status(400).json({ 
        error: 'garden_id and activity_type are required',
        received: { garden_id, activity_type }
      });
    }

    // Verify garden belongs to user
    const [garden] = await db.execute(
      'SELECT id FROM gardens WHERE id = ? AND user_id = ?',
      [garden_id, req.user.id]
    );

    if (garden.length === 0) {
      return res.status(404).json({ error: 'Garden not found or access denied' });
    }

    // Get current date and time
    const now = new Date();
    const activityDate = activity_date || now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const activityTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

    const [result] = await db.execute(
      `INSERT INTO garden_activities (user_id, garden_id, activity_type, plant_name, notes, activity_date, activity_time, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [req.user.id, garden_id, activity_type, plant_name || null, notes || null, activityDate, activityTime]
    );

    const [newActivity] = await db.execute(
      'SELECT * FROM garden_activities WHERE id = ? AND user_id = ?',
      [result.insertId, req.user.id]
    );

    res.status(201).json(newActivity[0]);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// PUT /api/activities/:id - Update activity
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const activityId = req.params.id;
    const { activity_type, plant_name, notes, activity_date } = req.body;
    const allowedActivityTypes = ['planted', 'watered', 'fertilized', 'harvested', 'pruned', 'weeded'];

    if (!activity_type || !activity_date) {
      return res.status(400).json({ error: 'activity_type and activity_date are required' });
    }

    if (!allowedActivityTypes.includes(activity_type)) {
      return res.status(400).json({ error: 'Invalid activity type' });
    }

    const [existingActivity] = await db.execute(
      'SELECT id FROM garden_activities WHERE id = ? AND user_id = ?',
      [activityId, req.user.id]
    );

    if (existingActivity.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    await db.execute(
      `UPDATE garden_activities 
       SET activity_type = ?, plant_name = ?, notes = ?, activity_date = ?
       WHERE id = ? AND user_id = ?`,
      [activity_type, plant_name || null, notes || null, activity_date, activityId, req.user.id]
    );

    const [updatedActivity] = await db.execute(
      'SELECT * FROM garden_activities WHERE id = ? AND user_id = ?',
      [activityId, req.user.id]
    );

    res.json(updatedActivity[0]);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// DELETE /api/activities/:id - Delete activity
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const activityId = req.params.id;
    
    const [result] = await db.execute(
      'DELETE FROM garden_activities WHERE id = ? AND user_id = ?',
      [activityId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

module.exports = router;
