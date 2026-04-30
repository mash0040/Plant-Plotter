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
      FROM garden_tasks t 
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
    const { 
      title, 
      description, 
      garden_id, 
      due_date, 
      priority, 
      plant_name, 
      task_type,
      estimated_duration,
      is_recurring,
      recurring_pattern,
      notes
    } = req.body;
    
    // Validate required fields
    if (!title || !garden_id || !due_date) {
      return res.status(400).json({ 
        error: 'title, garden_id, and due_date are required',
        received: { title, garden_id, due_date }
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
    
    const [result] = await db.execute(
      `INSERT INTO garden_tasks (
        user_id, garden_id, title, description, due_date, priority, plant_name, 
        task_type, status, estimated_duration, is_recurring, recurring_pattern,
        created_at
      ) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW())`,
      [
        req.user.id, 
        garden_id, 
        title, 
        description || null, 
        due_date, 
        priority || 'medium', 
        plant_name || null,
        task_type || 'maintenance',
        estimated_duration || null,
        is_recurring || false,
        recurring_pattern || null
      ]
    );

    const [newTask] = await db.execute(
      'SELECT * FROM garden_tasks WHERE id = ? AND user_id = ?',
      [result.insertId, req.user.id]
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
    const { 
      title, 
      description, 
      due_date, 
      priority, 
      status, 
      plant_name,
      task_type,
      estimated_duration,
      is_recurring,
      recurring_pattern,
      notes
    } = req.body;
    const allowedStatuses = ['pending', 'completed', 'cancelled', 'overdue'];
    const allowedTaskTypes = ['water', 'fertilize', 'harvest', 'plant', 'prune', 'weed', 'inspect', 'maintenance'];

    if (!title || !due_date) {
      return res.status(400).json({ error: 'title and due_date are required' });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }

    if (task_type && !allowedTaskTypes.includes(task_type)) {
      return res.status(400).json({ error: 'Invalid task type' });
    }

    const [existingTask] = await db.execute(
      'SELECT id FROM garden_tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (existingTask.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    await db.execute(
      `UPDATE garden_tasks
       SET title = ?, description = ?, due_date = ?, priority = ?, status = ?,
           plant_name = ?, task_type = ?, estimated_duration = ?, is_recurring = ?,
           recurring_pattern = ?
       WHERE id = ? AND user_id = ?`,
      [
        title,
        description ?? null,
        due_date,
        priority || 'medium',
        status || 'pending',
        plant_name ?? null,
        task_type || 'maintenance',
        estimated_duration ?? null,
        is_recurring ?? false,
        recurring_pattern ?? null,
        req.params.id,
        req.user.id
      ]
    );

    const [updatedTask] = await db.execute(
      'SELECT * FROM garden_tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
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
      'DELETE FROM garden_tasks WHERE id = ? AND user_id = ?',
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
