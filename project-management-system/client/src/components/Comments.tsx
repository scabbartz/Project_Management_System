import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface CommentsProps {
  projectId: string;
}

interface Comment {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const Comments: React.FC<CommentsProps> = ({ projectId }) => {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<number | null>(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/comments/project/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      } else {
        throw new Error('Failed to fetch comments');
      }
    } catch (err) {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [projectId, token]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Add new comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [data.comment, ...prev]);
        setNewComment('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add comment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Start editing comment
  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  // Update comment
  const handleUpdateComment = async (commentId: number) => {
    if (!editContent.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev =>
          prev.map(comment =>
            comment.id === commentId ? data.comment : comment
          )
        );
        setEditingComment(null);
        setEditContent('');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update comment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        setDeleteDialogOpen(null);
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (err) {
      setError('Failed to delete comment');
    } finally {
      setSubmitting(false);
    }
  };

  const canEditComment = (comment: Comment) => {
    return comment.authorId === user?.id;
  };

  const canDeleteComment = (comment: Comment) => {
    return comment.authorId === user?.id || user?.role === 'Admin';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Comments ({comments.length})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Add new comment */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Avatar sx={{ width: 32, height: 32, mt: 1 }}>
            {user?.name?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
              sx={{ mb: 1 }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Comments list */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      ) : comments.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No comments yet. Be the first to comment!
          </Typography>
        </Paper>
      ) : (
        <Box>
          {comments.map((comment, index) => (
            <Paper key={comment.id} sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {comment.authorAvatar ? (
                    <img src={comment.authorAvatar} alt={comment.authorName} />
                  ) : (
                    comment.authorName.charAt(0)
                  )}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" component="span">
                        {comment.authorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {formatDate(comment.createdAt)}
                        {comment.updatedAt !== comment.createdAt && ' (edited)'}
                      </Typography>
                    </Box>
                    <Box>
                      {canEditComment(comment) && (
                        <IconButton
                          size="small"
                          onClick={() => handleStartEdit(comment)}
                          disabled={submitting}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {canDeleteComment(comment) && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialogOpen(comment.id)}
                          disabled={submitting}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  {editingComment === comment.id ? (
                    <Box>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        disabled={submitting}
                        sx={{ mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={!editContent.trim() || submitting}
                        >
                          {submitting ? 'Updating...' : 'Update'}
                        </Button>
                        <Button
                          size="small"
                          onClick={handleCancelEdit}
                          disabled={submitting}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {comment.content}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen !== null}
        onClose={() => setDeleteDialogOpen(null)}
      >
        <DialogTitle>Delete Comment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this comment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(null)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => deleteDialogOpen && handleDeleteComment(deleteDialogOpen)}
            color="error"
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Comments; 