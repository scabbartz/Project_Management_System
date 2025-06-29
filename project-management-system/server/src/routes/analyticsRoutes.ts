import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get overall project statistics
router.get('/projects', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    // Total projects
    const totalProjectsResult = await client.query('SELECT COUNT(*) FROM projects');
    const totalProjects = parseInt(totalProjectsResult.rows[0].count);

    // Projects by status
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count
      FROM projects
      GROUP BY status
      ORDER BY count DESC
    `);

    // Projects by priority
    const priorityResult = await client.query(`
      SELECT priority, COUNT(*) as count
      FROM projects
      GROUP BY priority
      ORDER BY count DESC
    `);

    // Projects created in last 30 days
    const recentProjectsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM projects
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const recentProjects = parseInt(recentProjectsResult.rows[0].count);

    // Projects by month (last 6 months)
    const monthlyProjectsResult = await client.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM projects
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);

    client.release();

    res.json({
      totalProjects,
      recentProjects,
      byStatus: statusResult.rows,
      byPriority: priorityResult.rows,
      monthlyTrend: monthlyProjectsResult.rows.map(row => ({
        month: row.month,
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user activity statistics
router.get('/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    // Total users
    const totalUsersResult = await client.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Users by role
    const roleResult = await client.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);

    // Recent user registrations
    const recentUsersResult = await client.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const recentUsers = parseInt(recentUsersResult.rows[0].count);

    // Most active users (by project creation)
    const activeUsersResult = await client.query(`
      SELECT u.name, COUNT(p.id) as project_count
      FROM users u
      LEFT JOIN projects p ON u.id = p.created_by
      GROUP BY u.id, u.name
      ORDER BY project_count DESC
      LIMIT 10
    `);

    client.release();

    res.json({
      totalUsers,
      recentUsers,
      byRole: roleResult.rows,
      mostActive: activeUsersResult.rows
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get file upload statistics
router.get('/files', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    // Total files
    const totalFilesResult = await client.query('SELECT COUNT(*) FROM project_attachments');
    const totalFiles = parseInt(totalFilesResult.rows[0].count);

    // Total file size
    const totalSizeResult = await client.query('SELECT SUM(size) FROM project_attachments');
    const totalSize = parseInt(totalSizeResult.rows[0].sum || '0');

    // Files by type
    const fileTypeResult = await client.query(`
      SELECT 
        CASE 
          WHEN type LIKE 'image/%' THEN 'Images'
          WHEN type LIKE 'video/%' THEN 'Videos'
          WHEN type LIKE 'audio/%' THEN 'Audio'
          WHEN type LIKE 'application/pdf' THEN 'PDFs'
          WHEN type LIKE 'application/%' THEN 'Documents'
          WHEN type LIKE 'text/%' THEN 'Text Files'
          ELSE 'Other'
        END as category,
        COUNT(*) as count,
        SUM(size) as total_size
      FROM project_attachments
      GROUP BY category
      ORDER BY count DESC
    `);

    // Recent uploads
    const recentUploadsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM project_attachments
      WHERE uploaded_at >= NOW() - INTERVAL '30 days'
    `);
    const recentUploads = parseInt(recentUploadsResult.rows[0].count);

    // Uploads by month
    const monthlyUploadsResult = await client.query(`
      SELECT 
        DATE_TRUNC('month', uploaded_at) as month,
        COUNT(*) as count,
        SUM(size) as total_size
      FROM project_attachments
      WHERE uploaded_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', uploaded_at)
      ORDER BY month DESC
    `);

    client.release();

    res.json({
      totalFiles,
      totalSize,
      recentUploads,
      byType: fileTypeResult.rows,
      monthlyTrend: monthlyUploadsResult.rows.map(row => ({
        month: row.month,
        count: parseInt(row.count),
        totalSize: parseInt(row.total_size || '0')
      }))
    });
  } catch (error) {
    console.error('File analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get comment activity statistics
router.get('/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    // Total comments
    const totalCommentsResult = await client.query('SELECT COUNT(*) FROM project_comments');
    const totalComments = parseInt(totalCommentsResult.rows[0].count);

    // Recent comments
    const recentCommentsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM project_comments
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const recentComments = parseInt(recentCommentsResult.rows[0].count);

    // Most active commenters
    const activeCommentersResult = await client.query(`
      SELECT u.name, COUNT(pc.id) as comment_count
      FROM users u
      LEFT JOIN project_comments pc ON u.id = pc.author_id
      GROUP BY u.id, u.name
      ORDER BY comment_count DESC
      LIMIT 10
    `);

    // Comments by month
    const monthlyCommentsResult = await client.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM project_comments
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);

    client.release();

    res.json({
      totalComments,
      recentComments,
      mostActive: activeCommentersResult.rows,
      monthlyTrend: monthlyCommentsResult.rows.map(row => ({
        month: row.month,
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    console.error('Comment analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get system overview (combined statistics)
router.get('/overview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    // Get all basic counts
    const [
      projectsResult,
      usersResult,
      filesResult,
      commentsResult
    ] = await Promise.all([
      client.query('SELECT COUNT(*) FROM projects'),
      client.query('SELECT COUNT(*) FROM users'),
      client.query('SELECT COUNT(*) FROM project_attachments'),
      client.query('SELECT COUNT(*) FROM project_comments')
    ]);

    // Get recent activity (last 7 days)
    const recentActivityResult = await client.query(`
      SELECT 
        'projects' as type,
        COUNT(*) as count
      FROM projects
      WHERE created_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 
        'files' as type,
        COUNT(*) as count
      FROM project_attachments
      WHERE uploaded_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 
        'comments' as type,
        COUNT(*) as count
      FROM project_comments
      WHERE created_at >= NOW() - INTERVAL '7 days'
    `);

    // Get top projects by file count
    const topProjectsResult = await client.query(`
      SELECT 
        p.name,
        COUNT(pa.id) as file_count,
        COUNT(pc.id) as comment_count
      FROM projects p
      LEFT JOIN project_attachments pa ON p.id = pa.project_id
      LEFT JOIN project_comments pc ON p.id = pc.project_id
      GROUP BY p.id, p.name
      ORDER BY file_count DESC, comment_count DESC
      LIMIT 5
    `);

    client.release();

    const recentActivity = recentActivityResult.rows.reduce((acc: any, row) => {
      acc[row.type] = parseInt(row.count);
      return acc;
    }, {});

    res.json({
      summary: {
        projects: parseInt(projectsResult.rows[0].count),
        users: parseInt(usersResult.rows[0].count),
        files: parseInt(filesResult.rows[0].count),
        comments: parseInt(commentsResult.rows[0].count)
      },
      recentActivity,
      topProjects: topProjectsResult.rows
    });
  } catch (error) {
    console.error('Overview analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 