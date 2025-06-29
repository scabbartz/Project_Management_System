import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

// Export projects to CSV
router.get('/projects/csv', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        p.name,
        p.description,
        p.scope,
        p.status,
        p.priority,
        p.tags,
        p.created_at,
        u.name as created_by
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      ORDER BY p.created_at DESC
    `);

    client.release();

    // Create CSV content
    const csvHeader = 'Name,Description,Scope,Status,Priority,Tags,Created At,Created By\n';
    const csvRows = result.rows.map(row => {
      const tags = Array.isArray(row.tags) ? row.tags.join('; ') : row.tags || '';
      return `"${row.name}","${row.description || ''}","${row.scope || ''}","${row.status}","${row.priority}","${tags}","${row.created_at}","${row.created_by}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="projects_export.csv"');
    
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
});

// Export project details to PDF (simplified - would need a PDF library like puppeteer)
router.get('/projects/:id/pdf', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    // Get project details
    const projectResult = await client.query(`
      SELECT 
        p.*,
        u.name as created_by_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `, [id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Get project files
    const filesResult = await client.query(`
      SELECT * FROM project_attachments
      WHERE project_id = $1
      ORDER BY uploaded_at DESC
    `, [id]);

    // Get project comments
    const commentsResult = await client.query(`
      SELECT 
        pc.*,
        u.name as author_name
      FROM project_comments pc
      LEFT JOIN users u ON pc.author_id = u.id
      WHERE pc.project_id = $1
      ORDER BY pc.created_at DESC
    `, [id]);

    client.release();

    // Create HTML content for PDF (simplified)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Project Report - ${project.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { border-bottom: 2px solid #1976d2; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #1976d2; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-item { background: #f5f5f5; padding: 15px; border-radius: 5px; }
          .info-label { font-weight: bold; color: #666; }
          .status-${project.status.toLowerCase().replace(' ', '-')} { 
            background: ${getStatusColor(project.status)}; 
            color: white; 
            padding: 5px 10px; 
            border-radius: 3px; 
            display: inline-block; 
          }
          .priority-${project.priority.toLowerCase()} { 
            background: ${getPriorityColor(project.priority)}; 
            color: white; 
            padding: 5px 10px; 
            border-radius: 3px; 
            display: inline-block; 
          }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Project Report</h1>
          <h2>${project.name}</h2>
        </div>

        <div class="section">
          <h2>Project Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Status:</div>
              <span class="status-${project.status.toLowerCase().replace(' ', '-')}">${project.status}</span>
            </div>
            <div class="info-item">
              <div class="info-label">Priority:</div>
              <span class="priority-${project.priority.toLowerCase()}">${project.priority}</span>
            </div>
            <div class="info-item">
              <div class="info-label">Created By:</div>
              <div>${project.created_by_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Created At:</div>
              <div>${new Date(project.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Description:</div>
            <div>${project.description || 'No description provided'}</div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Scope:</div>
            <div>${project.scope || 'No scope defined'}</div>
          </div>
          
          ${project.tags && project.tags.length > 0 ? `
          <div class="info-item">
            <div class="info-label">Tags:</div>
            <div>${project.tags.join(', ')}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h2>Files (${filesResult.rows.length})</h2>
          ${filesResult.rows.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded At</th>
              </tr>
            </thead>
            <tbody>
              ${filesResult.rows.map(file => `
                <tr>
                  <td>${file.name}</td>
                  <td>${file.type}</td>
                  <td>${formatFileSize(file.size)}</td>
                  <td>${new Date(file.uploaded_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p>No files uploaded</p>'}
        </div>

        <div class="section">
          <h2>Comments (${commentsResult.rows.length})</h2>
          ${commentsResult.rows.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Author</th>
                <th>Comment</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${commentsResult.rows.map(comment => `
                <tr>
                  <td>${comment.author_name}</td>
                  <td>${comment.content}</td>
                  <td>${new Date(comment.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p>No comments yet</p>'}
        </div>
      </body>
      </html>
    `;

    // Set response headers for HTML (in a real implementation, this would be converted to PDF)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="project_${id}_report.html"`);
    
    res.send(htmlContent);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
});

// Export analytics data to CSV
router.get('/analytics/csv', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    // Get analytics data
    const [projectsResult, usersResult, filesResult] = await Promise.all([
      client.query('SELECT COUNT(*) as total FROM projects'),
      client.query('SELECT COUNT(*) as total FROM users'),
      client.query('SELECT COUNT(*) as total FROM project_attachments'),
      client.query(`
        SELECT status, COUNT(*) as count
        FROM projects
        GROUP BY status
      `),
      client.query(`
        SELECT priority, COUNT(*) as count
        FROM projects
        GROUP BY priority
      `)
    ]);

    client.release();

    // Create CSV content
    const csvContent = `Analytics Report - ${new Date().toLocaleDateString()}

Summary:
Total Projects,${projectsResult.rows[0].total}
Total Users,${usersResult.rows[0].total}
Total Files,${filesResult.rows[0].total}

Projects by Status:
Status,Count
${projectsResult.rows.map(row => `${row.status},${row.count}`).join('\n')}

Projects by Priority:
Priority,Count
${usersResult.rows.map(row => `${row.priority},${row.count}`).join('\n')}
`;

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics_report.csv"');
    
    res.send(csvContent);
  } catch (error) {
    console.error('Analytics CSV export error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
});

// Helper functions
function getStatusColor(status: string): string {
  switch (status) {
    case "Planning": return "#9e9e9e";
    case "Active": return "#4caf50";
    case "On Hold": return "#ff9800";
    case "Completed": return "#2196f3";
    case "Cancelled": return "#f44336";
    default: return "#9e9e9e";
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "Low": return "#4caf50";
    case "Medium": return "#ff9800";
    case "High": return "#f44336";
    case "Critical": return "#d32f2f";
    default: return "#9e9e9e";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router; 