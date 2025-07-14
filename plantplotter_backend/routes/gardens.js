const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const db = require('../config/db.js'); 

// GET /api/gardens
router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      'SELECT * FROM gardens WHERE user_id = ?',
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error fetching gardens:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/gardens
router.post('/', verifyToken, async (req, res) => {
  const { name, width, height, unit } = req.body;
  const userId = req.user.id;

  if (!name || !width || !height || !unit) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO gardens (user_id, name, width, height, unit) VALUES (?, ?, ?, ?, ?)',
      [userId, name, width, height, unit]
    );

    res.status(201).json({
      message: 'Garden created successfully',
      gardenId: result.insertId
    });

  } catch (err) {
    console.error('Error creating garden:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/gardens/:id
router.put('/:id', verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;
  const { name, width, height, unit } = req.body;

  if (!name || !width || !height || !unit) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE gardens SET name = ?, width = ?, height = ?, unit = ? WHERE id = ? AND user_id = ?',
      [name, width, height, unit, gardenId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Garden not found or unauthorized' });
    }

    res.json({ message: 'Garden updated successfully' });
  } catch (err) {
    console.error('Error updating garden:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/gardens/:id
router.delete('/:id', verifyToken, async (req, res) => {
  const gardenId = req.params.id;
  const userId = req.user.id;

  try {
    const [result] = await db.promise().query(
      'DELETE FROM gardens WHERE id = ? AND user_id = ?',
      [gardenId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Garden not found or unauthorized' });
    }

    res.json({ message: 'Garden deleted successfully' });
  } catch (err) {
    console.error('Error deleting garden:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
