import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload';

const router = express.Router();

// Upload single file
router.post('/upload', authenticateToken, uploadSingle, handleUploadError, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { projectId } = req.body;
    
    if (!projectId) {
      // Delete uploaded file if no project ID
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Verify project exists and user has access
    const client = await pool.connect();
    const projectResult = await client.query(
      'SELECT id, created_by FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      client.release();
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];
    const canUpload = project.created_by === req.user!.id || 
                     ['Admin', 'Manager'].includes(req.user!.role);

    if (!canUpload) {
      client.release();
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'You do not have permission to upload files to this project' });
    }

    // Save file info to database
    const fileResult = await client.query(
      `INSERT INTO project_attachments (
        project_id, name, url, size, type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        projectId,
        req.file.originalname,
        `/uploads/${req.file.filename}`,
        req.file.size,
        req.file.mimetype,
        req.user!.id
      ]
    );

    client.release();

    const attachment = fileResult.rows[0];
    res.status(201).json({
      message: 'File uploaded successfully',
      attachment: {
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        size: attachment.size,
        type: attachment.type,
        uploadedAt: attachment.uploaded_at
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upload multiple files
router.post('/upload-multiple', authenticateToken, uploadMultiple, handleUploadError, async (req: Request, res: Response) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { projectId } = req.body;
    
    if (!projectId) {
      // Delete uploaded files if no project ID
      (req.files as Express.Multer.File[]).forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Verify project exists and user has access
    const client = await pool.connect();
    const projectResult = await client.query(
      'SELECT id, created_by FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      client.release();
      (req.files as Express.Multer.File[]).forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = projectResult.rows[0];
    const canUpload = project.created_by === req.user!.id || 
                     ['Admin', 'Manager'].includes(req.user!.role);

    if (!canUpload) {
      client.release();
      (req.files as Express.Multer.File[]).forEach(file => {
        fs.unlinkSync(file.path);
      });
      return res.status(403).json({ message: 'You do not have permission to upload files to this project' });
    }

    // Save all files to database
    const attachments = [];
    for (const file of req.files as Express.Multer.File[]) {
      const fileResult = await client.query(
        `INSERT INTO project_attachments (
          project_id, name, url, size, type, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          projectId,
          file.originalname,
          `/uploads/${file.filename}`,
          file.size,
          file.mimetype,
          req.user!.id
        ]
      );

      attachments.push({
        id: fileResult.rows[0].id,
        name: fileResult.rows[0].name,
        url: fileResult.rows[0].url,
        size: fileResult.rows[0].size,
        type: fileResult.rows[0].type,
        uploadedAt: fileResult.rows[0].uploaded_at
      });
    }

    client.release();

    res.status(201).json({
      message: `${attachments.length} files uploaded successfully`,
      attachments
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get project attachments
router.get('/project/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const client = await pool.connect();
    const result = await client.query(
      `SELECT pa.*, u.name as uploaded_by_name 
       FROM project_attachments pa
       LEFT JOIN users u ON pa.uploaded_by = u.id
       WHERE pa.project_id = $1
       ORDER BY pa.uploaded_at DESC`,
      [projectId]
    );
    client.release();

    const attachments = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      url: row.url,
      size: row.size,
      type: row.type,
      uploadedBy: row.uploaded_by_name,
      uploadedAt: row.uploaded_at
    }));

    res.json({ attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download file
router.get('/download/:attachmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { attachmentId } = req.params;

    const client = await pool.connect();
    const result = await client.query(
      `SELECT pa.*, p.created_by as project_creator
       FROM project_attachments pa
       JOIN projects p ON pa.project_id = p.id
       WHERE pa.id = $1`,
      [attachmentId]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const attachment = result.rows[0];
    const projectCreator = attachment.project_creator;

    // Check if user has access to the project
    const hasAccess = projectCreator === req.user!.id || 
                     ['Admin', 'Manager'].includes(req.user!.role);

    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have permission to download this file' });
    }

    const filePath = path.join(__dirname, '../../', attachment.url);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.download(filePath, attachment.name);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete file
router.delete('/:attachmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { attachmentId } = req.params;

    const client = await pool.connect();
    const result = await client.query(
      `SELECT pa.*, p.created_by as project_creator, pa.uploaded_by
       FROM project_attachments pa
       JOIN projects p ON pa.project_id = p.id
       WHERE pa.id = $1`,
      [attachmentId]
    );

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'File not found' });
    }

    const attachment = result.rows[0];
    const projectCreator = attachment.project_creator;
    const fileUploader = attachment.uploaded_by;

    // Check if user can delete the file
    const canDelete = fileUploader === req.user!.id || 
                     projectCreator === req.user!.id || 
                     req.user!.role === 'Admin';

    if (!canDelete) {
      client.release();
      return res.status(403).json({ message: 'You do not have permission to delete this file' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../', attachment.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await client.query('DELETE FROM project_attachments WHERE id = $1', [attachmentId]);
    client.release();

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 