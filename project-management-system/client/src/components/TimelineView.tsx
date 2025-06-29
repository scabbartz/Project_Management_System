import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Flag as FlagIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Project, Milestone, Task, MilestoneFormData, TaskFormData } from '../types';

interface TimelineViewProps {
  project: Project;
  onUpdate: () => void;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const TimelineView: React.FC<TimelineViewProps> = ({ project, onUpdate }) => {
  const { token } = useAuth();
  const [timelineData, setTimelineData] = useState<{
    project: Project;
    milestones: Milestone[];
    unassignedTasks: Task[];
    dependencies: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [milestoneDialog, setMilestoneDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<MilestoneFormData>({
    name: '',
    description: '',
    due_date: '',
    order_index: 0,
  });
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    name: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    due_date: '',
    estimated_hours: 0,
    estimated_cost: 0,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'milestone' | 'task' | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchTimelineData();
  }, [project.id]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/timeline/projects/${project.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTimelineData(data);
      } else {
        throw new Error('Failed to fetch timeline data');
      }
    } catch (err) {
      setError('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const handleMilestoneSubmit = async () => {
    try {
      const url = editingMilestone 
        ? `${API_BASE_URL}/timeline/milestones/${editingMilestone.id}`
        : `${API_BASE_URL}/timeline/milestones`;
      
      const method = editingMilestone ? 'PUT' : 'POST';
      const body = editingMilestone 
        ? { ...milestoneForm, status: 'Pending' }
        : { ...milestoneForm, project_id: project.id };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMilestoneDialog(false);
        setEditingMilestone(null);
        setMilestoneForm({ name: '', description: '', due_date: '', order_index: 0 });
        fetchTimelineData();
        onUpdate();
      }
    } catch (error) {
      setError('Failed to save milestone');
    }
  };

  const handleTaskSubmit = async () => {
    try {
      const url = editingTask 
        ? `${API_BASE_URL}/timeline/tasks/${editingTask.id}`
        : `${API_BASE_URL}/timeline/tasks`;
      
      const method = editingTask ? 'PUT' : 'POST';
      const body = editingTask 
        ? { ...taskForm }
        : { ...taskForm, project_id: project.id };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setTaskDialog(false);
        setEditingTask(null);
        setTaskForm({ name: '', description: '', status: 'To Do', priority: 'Medium', due_date: '', estimated_hours: 0, estimated_cost: 0 });
        fetchTimelineData();
        onUpdate();
      }
    } catch (error) {
      setError('Failed to save task');
    }
  };

  const openDeleteDialog = (type: 'milestone' | 'task', id: number) => {
    setDeleteType(type);
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteType(null);
    setDeleteId(null);
  };

  const handleDeleteConfirmed = async () => {
    if (deleteType === 'milestone' && deleteId) {
      await handleDeleteMilestone(deleteId);
    } else if (deleteType === 'task' && deleteId) {
      await handleDeleteTask(deleteId);
    }
    closeDeleteDialog();
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    if (!window.confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/timeline/milestones/${milestoneId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchTimelineData();
        onUpdate();
      }
    } catch (error) {
      setError('Failed to delete milestone');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/timeline/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchTimelineData();
        onUpdate();
      }
    } catch (error) {
      setError('Failed to delete task');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'warning';
      case 'Overdue': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'error';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!timelineData) {
    return <Typography>No timeline data available</Typography>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Project Timeline
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingMilestone(null);
              setMilestoneForm({ name: '', description: '', due_date: '', order_index: 0 });
              setMilestoneDialog(true);
            }}
          >
            Add Milestone
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingTask(null);
              setTaskForm({ name: '', description: '', status: 'To Do', priority: 'Medium', due_date: '', estimated_hours: 0, estimated_cost: 0 });
              setTaskDialog(true);
            }}
          >
            Add Task
          </Button>
        </Box>
      </Box>

      {/* Project Progress */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Overall Progress: {project.progress}%
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={project.progress} 
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Start: {project.start_date ? formatDate(project.start_date) : 'Not set'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            End: {project.end_date ? formatDate(project.end_date) : 'Not set'}
          </Typography>
        </Box>
      </Paper>

      {/* Milestones */}
      <Typography variant="h6" gutterBottom>
        Milestones ({timelineData.milestones.length})
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {timelineData.milestones.map((milestone) => (
          <Grid item xs={12} md={6} key={milestone.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="h3">
                    {milestone.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingMilestone(milestone);
                        setMilestoneForm({
                          name: milestone.name,
                          description: milestone.description || '',
                          due_date: milestone.due_date,
                          order_index: milestone.order_index,
                        });
                        setMilestoneDialog(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => openDeleteDialog('milestone', milestone.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                
                {milestone.description && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {milestone.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={milestone.status}
                    color={getStatusColor(milestone.status)}
                    size="small"
                  />
                  <Chip
                    label={`${milestone.tasks?.length || 0} tasks`}
                    size="small"
                    variant="outlined"
                  />
                  {isOverdue(milestone.due_date) && (
                    <Chip
                      label="Overdue"
                      color="error"
                      size="small"
                      icon={<FlagIcon />}
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Due: {formatDate(milestone.due_date)}
                </Typography>

                {/* Milestone Tasks */}
                {milestone.tasks && milestone.tasks.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Tasks:
                    </Typography>
                    <List dense>
                      {milestone.tasks.map((task) => (
                        <ListItem key={task.id} sx={{ py: 0.5 }}>
                          <ListItemText
                            primary={task.name}
                            secondary={`${task.status} • ${task.assigned_to_name || 'Unassigned'}`}
                          />
                          <ListItemSecondaryAction>
                            <Chip
                              label={task.priority}
                              color={getPriorityColor(task.priority)}
                              size="small"
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Unassigned Tasks */}
      {timelineData.unassignedTasks.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>
            Unassigned Tasks ({timelineData.unassignedTasks.length})
          </Typography>
          <Grid container spacing={2}>
            {timelineData.unassignedTasks.map((task) => (
              <Grid item xs={12} md={6} key={task.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" component="h3">
                        {task.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingTask(task);
                            setTaskForm({
                              name: task.name,
                              description: task.description || '',
                              status: task.status,
                              priority: task.priority,
                              due_date: task.due_date || '',
                              estimated_hours: task.estimated_hours || 0,
                              estimated_cost: task.estimated_cost || 0,
                            });
                            setTaskDialog(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openDeleteDialog('task', task.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip
                        label={task.status}
                        color={getStatusColor(task.status)}
                        size="small"
                      />
                      <Chip
                        label={task.priority}
                        color={getPriorityColor(task.priority)}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      Assigned to: {task.assigned_to_name || 'Unassigned'}
                    </Typography>
                    {task.due_date && (
                      <Typography variant="body2" color="text.secondary">
                        Due: {formatDate(task.due_date)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialog} onClose={() => setMilestoneDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Milestone Name"
            value={milestoneForm.name}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={milestoneForm.description}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            value={milestoneForm.due_date}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Order Index"
            type="number"
            value={milestoneForm.order_index}
            onChange={(e) => setMilestoneForm({ ...milestoneForm, order_index: parseInt(e.target.value) })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMilestoneDialog(false)}>Cancel</Button>
          <Button onClick={handleMilestoneSubmit} variant="contained">
            {editingMilestone ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialog} onClose={() => setTaskDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Add Task'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Task Name"
            value={taskForm.name}
            onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Status</InputLabel>
            <Select
              value={taskForm.status}
              onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
            >
              <MenuItem value="To Do">To Do</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Review">Review</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Priority</InputLabel>
            <Select
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Due Date"
            type="date"
            value={taskForm.due_date}
            onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Estimated Hours"
            type="number"
            value={taskForm.estimated_hours}
            onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: parseFloat(e.target.value) })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialog(false)}>Cancel</Button>
          <Button onClick={handleTaskSubmit} variant="contained">
            {editingTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this {deleteType}?</DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteConfirmed} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimelineView; 