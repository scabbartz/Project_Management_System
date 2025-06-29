import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get project timeline (milestones and tasks)
router.get('/projects/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const client = await pool.connect();

    // Get project details
    const projectResult = await client.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get milestones
    const milestonesResult = await client.query(
      `SELECT m.*, 
              COUNT(t.id) as task_count,
              COUNT(CASE WHEN t.status = 'Completed' THEN 1 END) as completed_tasks
       FROM project_milestones m
       LEFT JOIN project_tasks t ON m.id = t.milestone_id
       WHERE m.project_id = $1
       GROUP BY m.id
       ORDER BY m.order_index, m.due_date`,
      [projectId]
    );

    // Get tasks
    const tasksResult = await client.query(
      `SELECT t.*, u.name as assigned_to_name, m.name as milestone_name
       FROM project_tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN project_milestones m ON t.milestone_id = m.id
       WHERE t.project_id = $1
       ORDER BY t.order_index, t.due_date`,
      [projectId]
    );

    // Get task dependencies
    const dependenciesResult = await client.query(
      `SELECT td.*, t.name as depends_on_task_name
       FROM task_dependencies td
       JOIN project_tasks t ON td.depends_on_task_id = t.id
       WHERE td.task_id IN (SELECT id FROM project_tasks WHERE project_id = $1)`,
      [projectId]
    );

    client.release();

    const project = projectResult.rows[0];
    const milestones = milestonesResult.rows;
    const tasks = tasksResult.rows;
    const dependencies = dependenciesResult.rows;

    // Organize tasks by milestone
    const milestonesWithTasks = milestones.map(milestone => ({
      ...milestone,
      tasks: tasks.filter(task => task.milestone_id === milestone.id)
    }));

    // Add unassigned tasks
    const unassignedTasks = tasks.filter(task => !task.milestone_id);

    res.json({
      project,
      milestones: milestonesWithTasks,
      unassignedTasks,
      dependencies
    });
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create milestone
router.post('/milestones', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { project_id, name, description, due_date, order_index } = req.body;
    const client = await pool.connect();

    const result = await client.query(
      `INSERT INTO project_milestones (project_id, name, description, due_date, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [project_id, name, description, due_date, order_index || 0]
    );

    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create milestone error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update milestone
router.put('/milestones/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, due_date, status, completed_date, order_index } = req.body;
    const client = await pool.connect();

    const result = await client.query(
      `UPDATE project_milestones 
       SET name = $1, description = $2, due_date = $3, status = $4, 
           completed_date = $5, order_index = $6
       WHERE id = $7
       RETURNING *`,
      [name, description, due_date, status, completed_date, order_index, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete milestone
router.delete('/milestones/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    const result = await client.query(
      'DELETE FROM project_milestones WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    client.release();
    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Delete milestone error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create task
router.post('/tasks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      project_id, milestone_id, name, description, status, priority,
      assigned_to, due_date, estimated_hours, order_index
    } = req.body;

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const client = await pool.connect();

    const result = await client.query(
      `INSERT INTO project_tasks (
        project_id, milestone_id, name, description, status, priority,
        assigned_to, due_date, estimated_hours, order_index, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [project_id, milestone_id, name, description, status, priority,
       assigned_to, due_date, estimated_hours, order_index || 0, req.user.id]
    );

    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update task
router.put('/tasks/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, description, status, priority, assigned_to, due_date,
      completed_date, estimated_hours, actual_hours, order_index
    } = req.body;

    const client = await pool.connect();

    const result = await client.query(
      `UPDATE project_tasks 
       SET name = $1, description = $2, status = $3, priority = $4,
           assigned_to = $5, due_date = $6, completed_date = $7,
           estimated_hours = $8, actual_hours = $9, order_index = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [name, description, status, priority, assigned_to, due_date,
       completed_date, estimated_hours, actual_hours, order_index, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete task
router.delete('/tasks/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    const result = await client.query(
      'DELETE FROM project_tasks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    client.release();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add task dependency
router.post('/tasks/:taskId/dependencies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { depends_on_task_id, dependency_type } = req.body;
    const client = await pool.connect();

    const result = await client.query(
      `INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [taskId, depends_on_task_id, dependency_type || 'Finish-to-Start']
    );

    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add dependency error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove task dependency
router.delete('/tasks/:taskId/dependencies/:dependencyId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { taskId, dependencyId } = req.params;
    const client = await pool.connect();

    const result = await client.query(
      'DELETE FROM task_dependencies WHERE id = $1 AND task_id = $2 RETURNING *',
      [dependencyId, taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Dependency not found' });
    }

    client.release();
    res.json({ message: 'Dependency removed successfully' });
  } catch (error) {
    console.error('Remove dependency error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get timeline statistics
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    // Get upcoming deadlines (next 7 days)
    const upcomingDeadlinesResult = await client.query(
      `SELECT 
        m.id, m.name, 'milestone' as type, m.due_date, p.name as project_name
       FROM project_milestones m
       JOIN projects p ON m.project_id = p.id
       WHERE m.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND m.status != 'Completed'
       UNION ALL
       SELECT 
        t.id, t.name, 'task' as type, t.due_date, p.name as project_name
       FROM project_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND t.status NOT IN ('Completed', 'Cancelled')
       ORDER BY due_date`
    );

    // Get overdue items
    const overdueItemsResult = await client.query(
      `SELECT 
        m.id, m.name, 'milestone' as type, m.due_date, p.name as project_name,
        CURRENT_DATE - m.due_date as days_overdue
       FROM project_milestones m
       JOIN projects p ON m.project_id = p.id
       WHERE m.due_date < CURRENT_DATE AND m.status != 'Completed'
       UNION ALL
       SELECT 
        t.id, t.name, 'task' as type, t.due_date, p.name as project_name,
        CURRENT_DATE - t.due_date as days_overdue
       FROM project_tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('Completed', 'Cancelled')
       ORDER BY days_overdue DESC`
    );

    // Get recent progress updates
    const recentProgressResult = await client.query(
      `SELECT 
        p.id as project_id, p.name as project_name, p.progress, p.updated_at
       FROM projects p
       WHERE p.updated_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY p.updated_at DESC
       LIMIT 10`
    );

    client.release();

    res.json({
      upcomingDeadlines: upcomingDeadlinesResult.rows,
      overdueItems: overdueItemsResult.rows,
      recentProgress: recentProgressResult.rows
    });
  } catch (error) {
    console.error('Timeline stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update project progress based on tasks
router.post('/projects/:projectId/update-progress', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const client = await pool.connect();

    // Calculate progress based on completed tasks
    const progressResult = await client.query(
      `SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_tasks
       FROM project_tasks
       WHERE project_id = $1`,
      [projectId]
    );

    const { total_tasks, completed_tasks } = progressResult.rows[0];
    const progress = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0;

    // Update project progress
    await client.query(
      'UPDATE projects SET progress = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [progress, projectId]
    );

    client.release();
    res.json({ progress, total_tasks, completed_tasks });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 