const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

// GET all plants in a garden
router.get('/', verifyToken, async (req, res) => {
  const gardenId = req.params.gardenId;

  try {
    const [plants] = await db.query(
      'SELECT * FROM plants WHERE garden_id = ?',
      [gardenId]
    );
    res.json(plants);
  } catch (err) {
    console.error('Error fetching plants:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST a new plant to a garden
router.post('/', verifyToken, async (req, res) => {
  const gardenId = req.params.gardenId;
  const { name, spacing, soil_type, image_url, x, y } = req.body;

  if (!name) return res.status(400).json({ message: 'Plant name is required' });

  try {
    const [result] = await db.query(
      `INSERT INTO plants (name, spacing, soil_type, image_url, x, y, garden_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, spacing, soil_type, image_url, x, y, gardenId]
    );
    res.status(201).json({
      message: 'Plant added successfully',
      plantId: result.insertId
    });
  } catch (err) {
    console.error('Error adding plant:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update a plant
router.put('/:id', verifyToken, async (req, res) => {
  const { name, spacing, soil_type, image_url, x, y } = req.body;
  const plantId = req.params.id;

  try {
    await db.query(
      `UPDATE plants
       SET name = ?, spacing = ?, soil_type = ?, image_url = ?, x = ?, y = ?
       WHERE id = ?`,
      [name, spacing, soil_type, image_url, x, y, plantId]
    );
    res.json({ message: 'Plant updated successfully' });
  } catch (err) {
    console.error('Error updating plant:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a plant
router.delete('/:id', verifyToken, async (req, res) => {
  const plantId = req.params.id;

  try {
    await db.query('DELETE FROM plants WHERE id = ?', [plantId]);
    res.json({ message: 'Plant deleted successfully' });
  } catch (err) {
    console.error('Error deleting plant:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
