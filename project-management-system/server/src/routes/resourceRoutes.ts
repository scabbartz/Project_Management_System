import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get project resource allocations
router.get('/projects/:projectId/allocations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const client = await pool.connect();

    const result = await client.query(
      `SELECT 
        ra.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
       FROM resource_allocations ra
       JOIN users u ON ra.user_id = u.id
       WHERE ra.project_id = $1
       ORDER BY ra.created_at DESC`,
      [projectId]
    );

    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create resource allocation
router.post('/projects/allocations', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const {
      project_id,
      user_id,
      role,
      allocation_percentage,
      start_date,
      end_date
    } = req.body;

    const client = await pool.connect();

    // Check if allocation already exists
    const existingAllocation = await client.query(
      'SELECT id FROM resource_allocations WHERE project_id = $1 AND user_id = $2',
      [project_id, user_id]
    );

    if (existingAllocation.rows.length > 0) {
      return res.status(400).json({ message: 'Resource already allocated to this project' });
    }

    // Check total allocation percentage
    const totalAllocation = await client.query(
      'SELECT SUM(allocation_percentage) as total FROM resource_allocations WHERE user_id = $1',
      [user_id]
    );

    const currentTotal = totalAllocation.rows[0].total || 0;
    if (currentTotal + allocation_percentage > 100) {
      return res.status(400).json({ 
        message: `Total allocation would exceed 100%. Current: ${currentTotal}%, Requested: ${allocation_percentage}%` 
      });
    }

    const result = await client.query(
      `INSERT INTO resource_allocations (
        project_id, user_id, role, allocation_percentage, start_date, end_date, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [project_id, user_id, role, allocation_percentage, start_date, end_date, req.user.id]
    );

    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create allocation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update resource allocation
router.put('/projects/allocations/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      role,
      allocation_percentage,
      start_date,
      end_date
    } = req.body;

    const client = await pool.connect();

    // Get current allocation
    const currentAllocation = await client.query(
      'SELECT user_id, allocation_percentage FROM resource_allocations WHERE id = $1',
      [id]
    );

    if (currentAllocation.rows.length === 0) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    const current = currentAllocation.rows[0];

    // Check total allocation percentage (excluding current allocation)
    const totalAllocation = await client.query(
      'SELECT SUM(allocation_percentage) as total FROM resource_allocations WHERE user_id = $1 AND id != $2',
      [current.user_id, id]
    );

    const currentTotal = totalAllocation.rows[0].total || 0;
    if (currentTotal + allocation_percentage > 100) {
      return res.status(400).json({ 
        message: `Total allocation would exceed 100%. Current: ${currentTotal}%, Requested: ${allocation_percentage}%` 
      });
    }

    const result = await client.query(
      `UPDATE resource_allocations 
       SET role = $1, allocation_percentage = $2, start_date = $3, end_date = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [role, allocation_percentage, start_date, end_date, id]
    );

    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update allocation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete resource allocation
router.delete('/projects/allocations/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    const result = await client.query(
      'DELETE FROM resource_allocations WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Allocation not found' });
    }

    client.release();
    res.json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    console.error('Delete allocation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get resource workload
router.get('/workload', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    const result = await client.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        COUNT(pt.id) as total_tasks,
        COUNT(CASE WHEN pt.status = 'Done' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN pt.due_date < CURRENT_DATE AND pt.status != 'Done' THEN 1 END) as overdue_tasks,
        COALESCE(SUM(pt.estimated_hours), 0) as estimated_hours,
        COALESCE(SUM(pt.actual_hours), 0) as actual_hours,
        COALESCE(SUM(ra.allocation_percentage), 0) as total_allocation
       FROM users u
       LEFT JOIN project_tasks pt ON u.id = pt.assigned_to
       LEFT JOIN resource_allocations ra ON u.id = ra.user_id
       GROUP BY u.id, u.name, u.email, u.role
       ORDER BY u.name`
    );

    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Get workload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get project resource analytics
router.get('/projects/:projectId/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const client = await pool.connect();

    // Resource allocation summary
    const allocationSummary = await client.query(
      `SELECT 
        COUNT(*) as total_resources,
        SUM(allocation_percentage) as total_allocation,
        AVG(allocation_percentage) as avg_allocation
       FROM resource_allocations
       WHERE project_id = $1`,
      [projectId]
    );

    // Tasks by resource
    const tasksByResource = await client.query(
      `SELECT 
        u.id,
        u.name,
        COUNT(pt.id) as total_tasks,
        COUNT(CASE WHEN pt.status = 'Done' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN pt.due_date < CURRENT_DATE AND pt.status != 'Done' THEN 1 END) as overdue_tasks,
        COALESCE(SUM(pt.estimated_hours), 0) as estimated_hours,
        COALESCE(SUM(pt.actual_hours), 0) as actual_hours
       FROM users u
       LEFT JOIN project_tasks pt ON u.id = pt.assigned_to AND pt.project_id = $1
       LEFT JOIN resource_allocations ra ON u.id = ra.user_id AND ra.project_id = $1
       WHERE ra.id IS NOT NULL
       GROUP BY u.id, u.name
       ORDER BY u.name`,
      [projectId]
    );

    // Resource utilization over time
    const utilizationOverTime = await client.query(
      `SELECT 
        DATE_TRUNC('week', pt.updated_at) as week,
        u.name,
        COUNT(pt.id) as tasks_completed,
        SUM(pt.actual_hours) as hours_logged
       FROM project_tasks pt
       JOIN users u ON pt.assigned_to = u.id
       JOIN resource_allocations ra ON u.id = ra.user_id AND ra.project_id = $1
       WHERE pt.project_id = $1 AND pt.status = 'Done'
       GROUP BY DATE_TRUNC('week', pt.updated_at), u.name
       ORDER BY week DESC, u.name
       LIMIT 20`,
      [projectId]
    );

    client.release();

    res.json({
      allocationSummary: allocationSummary.rows[0],
      tasksByResource: tasksByResource.rows,
      utilizationOverTime: utilizationOverTime.rows
    });
  } catch (error) {
    console.error('Get resource analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get capacity planning data
router.get('/capacity', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    // Overall capacity
    const overallCapacity = await client.query(
      `SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT ra.user_id) as allocated_users,
        SUM(ra.allocation_percentage) as total_allocation,
        AVG(ra.allocation_percentage) as avg_allocation
       FROM users u
       LEFT JOIN resource_allocations ra ON u.id = ra.user_id`
    );

    // Capacity by role
    const capacityByRole = await client.query(
      `SELECT 
        u.role,
        COUNT(u.id) as total_users,
        COUNT(ra.id) as allocated_users,
        COALESCE(SUM(ra.allocation_percentage), 0) as total_allocation,
        COALESCE(AVG(ra.allocation_percentage), 0) as avg_allocation
       FROM users u
       LEFT JOIN resource_allocations ra ON u.id = ra.user_id
       GROUP BY u.role
       ORDER BY u.role`
    );

    // Resource availability
    const resourceAvailability = await client.query(
      `SELECT 
        u.id,
        u.name,
        u.role,
        COALESCE(SUM(ra.allocation_percentage), 0) as total_allocation,
        (100 - COALESCE(SUM(ra.allocation_percentage), 0)) as available_capacity
       FROM users u
       LEFT JOIN resource_allocations ra ON u.id = ra.user_id
       GROUP BY u.id, u.name, u.role
       ORDER BY available_capacity DESC`
    );

    client.release();

    res.json({
      overallCapacity: overallCapacity.rows[0],
      capacityByRole: capacityByRole.rows,
      resourceAvailability: resourceAvailability.rows
    });
  } catch (error) {
    console.error('Get capacity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 