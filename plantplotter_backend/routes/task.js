const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/verifyToken');

// GET /api/tasks
router.get('/', verifyToken, async (req, res) => {
  try {
    const { gardenId } = req.query;
    let query = `
      SELECT t.*, g.name as garden_name 
      FROM tasks t 
      LEFT JOIN gardens g ON t.garden_id = g.id 
      WHERE t.user_id = ?
    `;
    const params = [req.user.id];

    if (gardenId) {
      query += ' AND t.garden_id = ?';
      params.push(gardenId);
    }

    query += ' ORDER BY t.due_date ASC';

    const [tasks] = await db.execute(query, params);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, garden_id, due_date, priority, plant_name } = req.body;
    
    const [result] = await db.execute(
      `INSERT INTO tasks (user_id, garden_id, title, description, due_date, priority, plant_name, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, garden_id, title, description, due_date, priority || 'medium', plant_name]
    );

    const [newTask] = await db.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newTask[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, description, due_date, priority, status, plant_name } = req.body;
    
    const [result] = await db.execute(
      `UPDATE tasks 
       SET title = ?, description = ?, due_date = ?, priority = ?, status = ?, plant_name = ?
       WHERE id = ? AND user_id = ?`,
      [title, description, due_date, priority, status, plant_name, req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const [updatedTask] = await db.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [req.params.id]
    );

    res.json(updatedTask[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;