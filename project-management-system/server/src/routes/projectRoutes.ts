import express, { Request, Response } from "express";
import pool from "../config/database";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = express.Router();

// Project status enum for future implementation
export enum ProjectStatus {
  PLANNING = 'Planning',
  ACTIVE = 'Active',
  ON_HOLD = 'On Hold',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

// Define a comprehensive Project interface
export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  scope?: string;
  objectives?: string[];
  deliverables?: string[];
  status?: ProjectStatus;
  createdBy?: string;
  assignedTo?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  budget?: number;
  tags?: string[];
}

// GET / - Get all projects (with optional filtering)
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, priority, tag } = req.query;
    let query = `
      SELECT p.*, u.name as created_by_name 
      FROM projects p 
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Add filters
    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      query += ` AND p.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (tag) {
      query += ` AND $${paramIndex} = ANY(p.tags)`;
      params.push(tag);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC`;

    const client = await pool.connect();
    const result = await client.query(query, params);
    client.release();

    const projects = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      scope: row.scope,
      objectives: row.objectives || [],
      deliverables: row.deliverables || [],
      status: row.status,
      priority: row.priority,
      budget: row.budget ? parseFloat(row.budget) : undefined,
      tags: row.tags || [],
      createdBy: row.created_by_name,
      assignedTo: row.assigned_to || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST / - Create a new project
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      description, 
      startDate, 
      endDate, 
      scope, 
      objectives, 
      deliverables, 
      status, 
      priority, 
      budget, 
      tags 
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO projects (
        name, description, start_date, end_date, scope, objectives, deliverables, 
        status, priority, budget, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        name,
        description,
        startDate,
        endDate,
        scope,
        objectives,
        deliverables,
        status || ProjectStatus.PLANNING,
        priority || 'Medium',
        budget,
        tags,
        req.user!.id
      ]
    );
    client.release();

    const project = result.rows[0];
    res.status(201).json({
      id: project.id.toString(),
      name: project.name,
      description: project.description,
      startDate: project.start_date,
      endDate: project.end_date,
      scope: project.scope,
      objectives: project.objectives || [],
      deliverables: project.deliverables || [],
      status: project.status,
      priority: project.priority,
      budget: project.budget ? parseFloat(project.budget) : undefined,
      tags: project.tags || [],
      createdBy: req.user!.id.toString(),
      createdAt: project.created_at,
      updatedAt: project.updated_at
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /:id - Get a single project by ID
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    const result = await client.query(
      `SELECT p.*, u.name as created_by_name 
       FROM projects p 
       LEFT JOIN users u ON p.created_by = u.id 
       WHERE p.id = $1`,
      [id]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    const project = result.rows[0];
    res.json({
      id: project.id.toString(),
      name: project.name,
      description: project.description,
      startDate: project.start_date,
      endDate: project.end_date,
      scope: project.scope,
      objectives: project.objectives || [],
      deliverables: project.deliverables || [],
      status: project.status,
      priority: project.priority,
      budget: project.budget ? parseFloat(project.budget) : undefined,
      tags: project.tags || [],
      createdBy: project.created_by_name,
      assignedTo: project.assigned_to || [],
      createdAt: project.created_at,
      updatedAt: project.updated_at
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /:id - Update a project
router.put("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      startDate, 
      endDate, 
      scope, 
      objectives, 
      deliverables, 
      status, 
      priority, 
      budget, 
      tags 
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const client = await pool.connect();

    // Check if project exists and user has permission
    const existingProject = await client.query(
      'SELECT created_by FROM projects WHERE id = $1',
      [id]
    );

    if (existingProject.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: "Project not found" });
    }

    // Only allow updates if user is creator or admin/manager
    const canEdit = existingProject.rows[0].created_by === req.user!.id || 
                   ['Admin', 'Manager'].includes(req.user!.role);

    if (!canEdit) {
      client.release();
      return res.status(403).json({ message: "You don't have permission to edit this project" });
    }

    const result = await client.query(
      `UPDATE projects SET 
        name = $1, description = $2, start_date = $3, end_date = $4, 
        scope = $5, objectives = $6, deliverables = $7, status = $8, 
        priority = $9, budget = $10, tags = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        name, description, startDate, endDate, scope, objectives, deliverables,
        status, priority, budget, tags, id
      ]
    );
    client.release();

    const project = result.rows[0];
    res.json({
      id: project.id.toString(),
      name: project.name,
      description: project.description,
      startDate: project.start_date,
      endDate: project.end_date,
      scope: project.scope,
      objectives: project.objectives || [],
      deliverables: project.deliverables || [],
      status: project.status,
      priority: project.priority,
      budget: project.budget ? parseFloat(project.budget) : undefined,
      tags: project.tags || [],
      createdBy: project.created_by.toString(),
      createdAt: project.created_at,
      updatedAt: project.updated_at
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /:id - Delete a project
router.delete("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();

    // Check if project exists and user has permission
    const existingProject = await client.query(
      'SELECT created_by FROM projects WHERE id = $1',
      [id]
    );

    if (existingProject.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: "Project not found" });
    }

    // Only allow deletion if user is creator or admin
    const canDelete = existingProject.rows[0].created_by === req.user!.id || 
                     req.user!.role === 'Admin';

    if (!canDelete) {
      client.release();
      return res.status(403).json({ message: "You don't have permission to delete this project" });
    }

    await client.query('DELETE FROM projects WHERE id = $1', [id]);
    client.release();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
