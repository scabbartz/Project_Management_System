import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Search projects and files
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { q: query, type, status, priority, dateFrom, dateTo } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchTerm = `%${query.trim()}%`;
    const client = await pool.connect();

    let results: any = {};

    // Search projects
    if (!type || type === 'projects') {
      let projectQuery = `
        SELECT p.*, u.name as created_by_name
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE (
          p.name ILIKE $1 OR 
          p.description ILIKE $1 OR 
          p.scope ILIKE $1 OR
          p.tags::text ILIKE $1
        )
      `;
      const projectParams: any[] = [searchTerm];
      let paramIndex = 2;

      // Add filters
      if (status) {
        projectQuery += ` AND p.status = $${paramIndex}`;
        projectParams.push(status);
        paramIndex++;
      }

      if (priority) {
        projectQuery += ` AND p.priority = $${paramIndex}`;
        projectParams.push(priority);
        paramIndex++;
      }

      if (dateFrom) {
        projectQuery += ` AND p.created_at >= $${paramIndex}`;
        projectParams.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        projectQuery += ` AND p.created_at <= $${paramIndex}`;
        projectParams.push(dateTo);
        paramIndex++;
      }

      projectQuery += ` ORDER BY p.created_at DESC`;

      const projectResult = await client.query(projectQuery, projectParams);
      results.projects = projectResult.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        description: row.description,
        status: row.status,
        priority: row.priority,
        createdBy: row.created_by_name,
        createdAt: row.created_at,
        type: 'project'
      }));
    }

    // Search files
    if (!type || type === 'files') {
      let fileQuery = `
        SELECT pa.*, p.name as project_name, u.name as uploaded_by_name
        FROM project_attachments pa
        JOIN projects p ON pa.project_id = p.id
        LEFT JOIN users u ON pa.uploaded_by = u.id
        WHERE (
          pa.name ILIKE $1 OR
          p.name ILIKE $1
        )
      `;
      const fileParams: any[] = [searchTerm];
      let paramIndex = 2;

      // Add date filters for files
      if (dateFrom) {
        fileQuery += ` AND pa.uploaded_at >= $${paramIndex}`;
        fileParams.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        fileQuery += ` AND pa.uploaded_at <= $${paramIndex}`;
        fileParams.push(dateTo);
        paramIndex++;
      }

      fileQuery += ` ORDER BY pa.uploaded_at DESC`;

      const fileResult = await client.query(fileQuery, fileParams);
      results.files = fileResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        url: row.url,
        size: row.size,
        type: row.type,
        projectName: row.project_name,
        uploadedBy: row.uploaded_by_name,
        uploadedAt: row.uploaded_at
      }));
    }

    // Search comments
    if (!type || type === 'comments') {
      const commentQuery = `
        SELECT pc.*, p.name as project_name, u.name as author_name
        FROM project_comments pc
        JOIN projects p ON pc.project_id = p.id
        LEFT JOIN users u ON pc.author_id = u.id
        WHERE pc.content ILIKE $1
        ORDER BY pc.created_at DESC
      `;

      const commentResult = await client.query(commentQuery, [searchTerm]);
      results.comments = commentResult.rows.map(row => ({
        id: row.id,
        content: row.content,
        projectName: row.project_name,
        authorName: row.author_name,
        createdAt: row.created_at,
        type: 'comment'
      }));
    }

    client.release();

    // Calculate total results
    const totalResults = (results.projects?.length || 0) + 
                        (results.files?.length || 0) + 
                        (results.comments?.length || 0);

    res.json({
      query: query,
      totalResults,
      results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search projects only
router.get('/projects', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { q: query, status, priority, dateFrom, dateTo, limit = '10' } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchTerm = `%${query.trim()}%`;
    const client = await pool.connect();

    let projectQuery = `
      SELECT p.*, u.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE (
        p.name ILIKE $1 OR 
        p.description ILIKE $1 OR 
        p.scope ILIKE $1 OR
        p.tags::text ILIKE $1
      )
    `;
    const projectParams: any[] = [searchTerm];
    let paramIndex = 2;

    // Add filters
    if (status) {
      projectQuery += ` AND p.status = $${paramIndex}`;
      projectParams.push(status);
      paramIndex++;
    }

    if (priority) {
      projectQuery += ` AND p.priority = $${paramIndex}`;
      projectParams.push(priority);
      paramIndex++;
    }

    if (dateFrom) {
      projectQuery += ` AND p.created_at >= $${paramIndex}`;
      projectParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      projectQuery += ` AND p.created_at <= $${paramIndex}`;
      projectParams.push(dateTo);
      paramIndex++;
    }

    projectQuery += ` ORDER BY p.created_at DESC LIMIT $${paramIndex}`;
    projectParams.push(parseInt(limit as string));

    const projectResult = await client.query(projectQuery, projectParams);
    client.release();

    const projects = projectResult.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      status: row.status,
      priority: row.priority,
      createdBy: row.created_by_name,
      createdAt: row.created_at,
      tags: row.tags || []
    }));

    res.json({
      query: query,
      totalResults: projects.length,
      projects
    });
  } catch (error) {
    console.error('Project search error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search files only
router.get('/files', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { q: query, dateFrom, dateTo, limit = '10' } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchTerm = `%${query.trim()}%`;
    const client = await pool.connect();

    let fileQuery = `
      SELECT pa.*, p.name as project_name, u.name as uploaded_by_name
      FROM project_attachments pa
      JOIN projects p ON pa.project_id = p.id
      LEFT JOIN users u ON pa.uploaded_by = u.id
      WHERE (
        pa.name ILIKE $1 OR
        p.name ILIKE $1
      )
    `;
    const fileParams: any[] = [searchTerm];
    let paramIndex = 2;

    // Add date filters
    if (dateFrom) {
      fileQuery += ` AND pa.uploaded_at >= $${paramIndex}`;
      fileParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      fileQuery += ` AND pa.uploaded_at <= $${paramIndex}`;
      fileParams.push(dateTo);
      paramIndex++;
    }

    fileQuery += ` ORDER BY pa.uploaded_at DESC LIMIT $${paramIndex}`;
    fileParams.push(parseInt(limit as string));

    const fileResult = await client.query(fileQuery, fileParams);
    client.release();

    const files = fileResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      url: row.url,
      size: row.size,
      type: row.type,
      projectName: row.project_name,
      uploadedBy: row.uploaded_by_name,
      uploadedAt: row.uploaded_at
    }));

    res.json({
      query: query,
      totalResults: files.length,
      files
    });
  } catch (error) {
    console.error('File search error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get search suggestions
router.get('/suggestions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { q: query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const searchTerm = `%${query.trim()}%`;
    const client = await pool.connect();

    // Get project name suggestions
    const projectQuery = `
      SELECT DISTINCT name
      FROM projects
      WHERE name ILIKE $1
      ORDER BY name
      LIMIT 5
    `;

    // Get tag suggestions
    const tagQuery = `
      SELECT DISTINCT unnest(tags) as tag
      FROM projects
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      AND unnest(tags) ILIKE $1
      ORDER BY tag
      LIMIT 5
    `;

    const [projectResult, tagResult] = await Promise.all([
      client.query(projectQuery, [searchTerm]),
      client.query(tagQuery, [searchTerm])
    ]);

    client.release();

    const suggestions = [
      ...projectResult.rows.map(row => ({ type: 'project', value: row.name })),
      ...tagResult.rows.map(row => ({ type: 'tag', value: row.tag }))
    ];

    res.json({ suggestions });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 