const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/verifyToken');
const { sendDatabaseAwareErrorResponse } = require('../utils/databaseAvailability');
const { sendErrorResponse } = require('../utils/apiErrorResponse');
const allowedActivityTypes = ['planted', 'watered', 'fertilized', 'harvested', 'pruned', 'weeded'];

const validateActivityTime = (req, res) => {
  const value = req.body.activity_time;
  if (value === undefined || value === null || value === '') return true;
  if (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return true;
  sendErrorResponse(res, 400, 'Enter a valid time or leave it blank if you are unsure.', {
    code: 'VALIDATION_ERROR',
    errors: { activity_time: 'Use a time between 00:00 and 23:59.' }
  });
  return false;
};

const normalizeActivityTime = (value) => value ? (value.length === 5 ? `${value}:00` : value) : null;

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
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to fetch activities' });
  }
});

// POST /api/activities
router.post('/', verifyToken, async (req, res) => {
  try {
    const { garden_id, activity_type, plant_name, notes, activity_date } = req.body;
    
    // Validate required fields
    if (!garden_id || !activity_type) {
      return sendErrorResponse(res, 400, 'garden_id and activity_type are required', {
        code: 'VALIDATION_ERROR',
        errors: {
          garden_id: !garden_id ? 'garden_id is required' : undefined,
          activity_type: !activity_type ? 'activity_type is required' : undefined
        }
      });
    }

    if (!allowedActivityTypes.includes(activity_type)) {
      return sendErrorResponse(res, 400, 'Invalid activity type', {
        code: 'VALIDATION_ERROR'
      });
    }

    if (!validateActivityTime(req, res)) return;

    // Verify garden belongs to user
    const [garden] = await db.execute(
      'SELECT id FROM gardens WHERE id = ? AND user_id = ?',
      [garden_id, req.user.id]
    );

    if (garden.length === 0) {
      return sendErrorResponse(res, 404, 'Garden not found or access denied', {
        code: 'GARDEN_NOT_FOUND'
      });
    }

    // Get current date and time
    const now = new Date();
    const activityDate = activity_date || now.toISOString().split('T')[0]; // YYYY-MM-DD format
    // Older clients omit the field; explicit null means the performed time is unknown.
    const activityTime = req.body.activity_time === undefined
      ? now.toTimeString().split(' ')[0]
      : normalizeActivityTime(req.body.activity_time);

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
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to create activity' });
  }
});

// PUT /api/activities/:id - Update activity
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const activityId = req.params.id;
    const { activity_type, plant_name, notes, activity_date } = req.body;

    if (!activity_type || !activity_date) {
      return sendErrorResponse(res, 400, 'activity_type and activity_date are required', {
        code: 'VALIDATION_ERROR',
        errors: {
          activity_type: !activity_type ? 'activity_type is required' : undefined,
          activity_date: !activity_date ? 'activity_date is required' : undefined
        }
      });
    }

    if (!allowedActivityTypes.includes(activity_type)) {
      return sendErrorResponse(res, 400, 'Invalid activity type', {
        code: 'VALIDATION_ERROR'
      });
    }

    if (!validateActivityTime(req, res)) return;

    const [existingActivity] = await db.execute(
      'SELECT id FROM garden_activities WHERE id = ? AND user_id = ?',
      [activityId, req.user.id]
    );

    if (existingActivity.length === 0) {
      return sendErrorResponse(res, 404, 'Activity not found', {
        code: 'ACTIVITY_NOT_FOUND'
      });
    }
    
    const hasActivityTime = req.body.activity_time !== undefined;
    const updateValues = [activity_type, plant_name || null, notes || null, activity_date];
    if (hasActivityTime) updateValues.push(normalizeActivityTime(req.body.activity_time));
    updateValues.push(activityId, req.user.id);
    await db.execute(
      `UPDATE garden_activities 
       SET activity_type = ?, plant_name = ?, notes = ?, activity_date = ?${hasActivityTime ? ', activity_time = ?' : ''}
       WHERE id = ? AND user_id = ?`,
      updateValues
    );

    const [updatedActivity] = await db.execute(
      'SELECT * FROM garden_activities WHERE id = ? AND user_id = ?',
      [activityId, req.user.id]
    );

    res.json(updatedActivity[0]);
  } catch (error) {
    console.error('Error updating activity:', error);
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to update activity' });
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
      return sendErrorResponse(res, 404, 'Activity not found', {
        code: 'ACTIVITY_NOT_FOUND'
      });
    }

    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to delete activity' });
  }
});

module.exports = router;
