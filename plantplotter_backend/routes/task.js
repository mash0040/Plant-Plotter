const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/verifyToken');
const { sendDatabaseAwareErrorResponse } = require('../utils/databaseAvailability');
const { sendErrorResponse } = require('../utils/apiErrorResponse');
const {
  getNextOccurrenceDate,
  shouldScheduleNextOccurrence,
  validateTaskRecurrence
} = require('../utils/taskRecurrence');

const allowedTaskTypes = ['water', 'fertilize', 'harvest', 'plant', 'prune', 'weed', 'inspect', 'treat', 'other', 'maintenance'];

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
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to fetch tasks' });
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
      return sendErrorResponse(res, 400, 'title, garden_id, and due_date are required', {
        code: 'VALIDATION_ERROR',
        errors: {
          title: !title ? 'title is required' : undefined,
          garden_id: !garden_id ? 'garden_id is required' : undefined,
          due_date: !due_date ? 'due_date is required' : undefined
        }
      });
    }

    if (task_type && !allowedTaskTypes.includes(task_type)) {
      return sendErrorResponse(res, 400, 'Invalid task type', {
        code: 'VALIDATION_ERROR'
      });
    }

    const recurrence = validateTaskRecurrence({
      isRecurring: is_recurring,
      recurringPattern: recurring_pattern
    });
    if (!recurrence.isValid) {
      return sendErrorResponse(res, 400, recurrence.error, {
        code: 'VALIDATION_ERROR',
        errors: { recurring_pattern: recurrence.error }
      });
    }

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
        recurrence.isRecurring,
        recurrence.recurringPattern
      ]
    );

    const [newTask] = await db.execute(
      'SELECT * FROM garden_tasks WHERE id = ? AND user_id = ?',
      [result.insertId, req.user.id]
    );

    res.status(201).json(newTask[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to create task' });
  }
});

// PUT edits a task; PATCH changes only its status using the stored metadata.
const updateTask = async (req, res) => {
  let connection;

  try {
    const statusOnly = req.method === 'PATCH';
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
    } = req.body || {};
    const allowedStatuses = ['pending', 'completed', 'cancelled', 'overdue'];
    if (!statusOnly && (!title || !due_date)) {
      return sendErrorResponse(res, 400, 'title and due_date are required', {
        code: 'VALIDATION_ERROR',
        errors: {
          title: !title ? 'title is required' : undefined,
          due_date: !due_date ? 'due_date is required' : undefined
        }
      });
    }

    if ((statusOnly || status) && !allowedStatuses.includes(status)) {
      return sendErrorResponse(res, 400, 'Invalid task status', {
        code: 'VALIDATION_ERROR'
      });
    }

    if (!statusOnly && task_type && !allowedTaskTypes.includes(task_type)) {
      return sendErrorResponse(res, 400, 'Invalid task type', {
        code: 'VALIDATION_ERROR'
      });
    }

    let recurrence = statusOnly ? null : validateTaskRecurrence({
      isRecurring: is_recurring,
      recurringPattern: recurring_pattern
    });
    if (recurrence && !recurrence.isValid) {
      return sendErrorResponse(res, 400, recurrence.error, {
        code: 'VALIDATION_ERROR',
        errors: { recurring_pattern: recurrence.error }
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingTask] = await connection.execute(
      'SELECT * FROM garden_tasks WHERE id = ? AND user_id = ? FOR UPDATE',
      [req.params.id, req.user.id]
    );

    if (existingTask.length === 0) {
      await connection.rollback();
      return sendErrorResponse(res, 404, 'Task not found', {
        code: 'TASK_NOT_FOUND'
      });
    }

    const nextStatus = status || 'pending';
    const task = statusOnly ? existingTask[0] : {
      ...existingTask[0], title, description, due_date, priority, plant_name,
      task_type, estimated_duration
    };
    if (statusOnly) {
      // Recurrence is relevant only when this transition schedules another task.
      recurrence = {
        isRecurring: task.is_recurring === true || task.is_recurring === 1,
        recurringPattern: task.recurring_pattern
      };
    }
    const shouldCreateNextOccurrence = shouldScheduleNextOccurrence({
      previousStatus: existingTask[0].status,
      nextStatus,
      isRecurring: recurrence.isRecurring
    });
    const nextOccurrenceDate = shouldCreateNextOccurrence
      ? getNextOccurrenceDate(task.due_date, recurrence.recurringPattern)
      : null;

    if (shouldCreateNextOccurrence && !nextOccurrenceDate) {
      await connection.rollback();
      return sendErrorResponse(res, 400, 'Edit this recurring task to set a valid due date and recurrence before completing it.', {
        code: 'VALIDATION_ERROR',
        errors: { due_date: 'Check the due date and recurrence pattern.' }
      });
    }

    // Preserve a recorded timestamp on repeat requests, including legacy completions.
    const completedAtSql = nextStatus !== 'completed' ? 'NULL'
      : existingTask[0].status === 'completed' ? 'COALESCE(completed_at, NOW())' : 'NOW()';
    if (statusOnly) {
      await connection.execute(
        `UPDATE garden_tasks SET status = ?, completed_at = ${completedAtSql}
         WHERE id = ? AND user_id = ?`,
        [nextStatus, req.params.id, req.user.id]
      );
    } else {
      await connection.execute(
        `UPDATE garden_tasks
         SET title = ?, description = ?, due_date = ?, priority = ?, status = ?,
             plant_name = ?, task_type = ?, estimated_duration = ?, is_recurring = ?,
             recurring_pattern = ?, completed_at = ${completedAtSql}
         WHERE id = ? AND user_id = ?`,
        [
          title,
          description ?? null,
          due_date,
          priority || 'medium',
          nextStatus,
          plant_name ?? null,
          task_type || 'maintenance',
          estimated_duration ?? null,
          recurrence.isRecurring,
          recurrence.recurringPattern,
          req.params.id,
          req.user.id
        ]
      );
    }

    if (nextOccurrenceDate) {
      await connection.execute(
        `INSERT INTO garden_tasks (
          user_id, garden_id, title, description, due_date, priority, plant_name,
          task_type, status, estimated_duration, is_recurring, recurring_pattern,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW())`,
        [
          req.user.id,
          existingTask[0].garden_id,
          task.title,
          task.description ?? null,
          nextOccurrenceDate,
          task.priority || 'medium',
          task.plant_name ?? null,
          task.task_type || 'maintenance',
          task.estimated_duration ?? null,
          recurrence.isRecurring,
          recurrence.recurringPattern
        ]
      );
    }

    const [updatedTask] = await connection.execute(
      'SELECT * FROM garden_tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    await connection.commit();
    res.json(updatedTask[0]);
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Task update rollback error:', rollbackError.message);
      }
    }
    console.error('Error updating task:', error);
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to update task' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

router.put('/:id', verifyToken, updateTask);
router.patch('/:id', verifyToken, updateTask);

// DELETE /api/tasks/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM garden_tasks WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return sendErrorResponse(res, 404, 'Task not found', {
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    sendDatabaseAwareErrorResponse(res, error, { error: 'Failed to delete task' });
  }
});

module.exports = router;
