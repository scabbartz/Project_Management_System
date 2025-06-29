import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get project comments
router.get('/project/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const client = await pool.connect();
    const result = await client.query(
      `SELECT pc.*, u.name as author_name, u.avatar as author_avatar
       FROM project_comments pc
       LEFT JOIN users u ON pc.author_id = u.id
       WHERE pc.project_id = $1
       ORDER BY pc.created_at DESC`,
      [projectId]
    );
    client.release();

    const comments = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      authorId: row.author_id,
      authorName: row.author_name,
      authorAvatar: row.author_avatar,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new comment
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId, content } = req.body;

    if (!projectId || !content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Project ID and content are required' });
    }

    // Verify project exists
    const client = await pool.connect();
    const projectResult = await client.query(
      'SELECT id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Project not found' });
    }

    // Create comment
    const commentResult = await client.query(
      `INSERT INTO project_comments (
        project_id, content, author_id
      ) VALUES ($1, $2, $3)
      RETURNING *`,
      [projectId, content.trim(), req.user!.id]
    );

    // Get author info
    const authorResult = await client.query(
      'SELECT name, avatar FROM users WHERE id = $1',
      [req.user!.id]
    );

    client.release();

    const comment = commentResult.rows[0];
    const author = authorResult.rows[0];

    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        id: comment.id,
        content: comment.content,
        authorId: comment.author_id,
        authorName: author.name,
        authorAvatar: author.avatar,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update comment
router.put('/:commentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const client = await pool.connect();

    // Get comment and verify ownership
    const commentResult = await client.query(
      'SELECT * FROM project_comments WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Comment not found' });
    }

    const comment = commentResult.rows[0];

    // Only author can edit their comment
    if (comment.author_id !== req.user!.id) {
      client.release();
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }

    // Update comment
    const updateResult = await client.query(
      `UPDATE project_comments 
       SET content = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2
       RETURNING *`,
      [content.trim(), commentId]
    );

    // Get author info
    const authorResult = await client.query(
      'SELECT name, avatar FROM users WHERE id = $1',
      [req.user!.id]
    );

    client.release();

    const updatedComment = updateResult.rows[0];
    const author = authorResult.rows[0];

    res.json({
      message: 'Comment updated successfully',
      comment: {
        id: updatedComment.id,
        content: updatedComment.content,
        authorId: updatedComment.author_id,
        authorName: author.name,
        authorAvatar: author.avatar,
        createdAt: updatedComment.created_at,
        updatedAt: updatedComment.updated_at
      }
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete comment
router.delete('/:commentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    const client = await pool.connect();

    // Get comment and verify permissions
    const commentResult = await client.query(
      `SELECT pc.*, p.created_by as project_creator
       FROM project_comments pc
       JOIN projects p ON pc.project_id = p.id
       WHERE pc.id = $1`,
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'Comment not found' });
    }

    const comment = commentResult.rows[0];
    const projectCreator = comment.project_creator;

    // Author, project creator, or admin can delete
    const canDelete = comment.author_id === req.user!.id || 
                     projectCreator === req.user!.id || 
                     req.user!.role === 'Admin';

    if (!canDelete) {
      client.release();
      return res.status(403).json({ message: 'You do not have permission to delete this comment' });
    }

    // Delete comment
    await client.query('DELETE FROM project_comments WHERE id = $1', [commentId]);
    client.release();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 