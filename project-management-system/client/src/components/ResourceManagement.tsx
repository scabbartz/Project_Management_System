import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Avatar,
  AvatarGroup,
  Tooltip,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { User, Task, Project } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ResourceManagementProps {
  projectId: number;
  onRefresh: () => void;
}

interface ResourceAllocation {
  id: number;
  user_id: number;
  project_id: number;
  role: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string;
  user: User;
}

interface WorkloadData {
  user: User;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  estimatedHours: number;
  actualHours: number;
  allocationPercentage: number;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const ResourceManagement: React.FC<ResourceManagementProps> = ({
  projectId,
  onRefresh
}) => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ResourceAllocation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchTasks(),
        fetchAllocations(),
        calculateWorkload()
      ]);
    } catch (error) {
      console.error('Failed to fetch resource data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchAllocations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/allocations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAllocations(data);
      }
    } catch (error) {
      console.error('Failed to fetch allocations:', error);
    }
  };

  const calculateWorkload = () => {
    const workload: WorkloadData[] = users.map(user => {
      const userTasks = tasks.filter(task => task.assigned_to === user.id);
      const allocation = allocations.find(a => a.user_id === user.id);
      
      return {
        user,
        totalTasks: userTasks.length,
        completedTasks: userTasks.filter(t => t.status === 'Done').length,
        overdueTasks: userTasks.filter(t => 
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Done'
        ).length,
        estimatedHours: userTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
        actualHours: userTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0),
        allocationPercentage: allocation?.allocation_percentage || 0
      };
    });
    
    setWorkloadData(workload);
  };

  const handleAddAllocation = async (formData: any) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/allocations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          project_id: projectId
        })
      });

      if (response.ok) {
        await fetchAllocations();
        calculateWorkload();
        onRefresh();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add allocation');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllocation = async (formData: any) => {
    if (!editingAllocation) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/allocations/${editingAllocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchAllocations();
        calculateWorkload();
        onRefresh();
        setEditingAllocation(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update allocation');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (allocationId: number) => {
    setAllocationToDelete(allocationId);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setAllocationToDelete(null);
  };

  const handleDeleteAllocation = async () => {
    if (!allocationToDelete) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/projects/allocations/${allocationToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchAllocations();
        calculateWorkload();
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete allocation:', error);
    }
    closeDeleteDialog();
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'success';
      case 'In Progress': return 'primary';
      case 'Review': return 'warning';
      default: return 'default';
    }
  };

  const chartData = workloadData.map(item => ({
    name: item.user.name,
    tasks: item.totalTasks,
    completed: item.completedTasks,
    overdue: item.overdueTasks,
    allocation: item.allocationPercentage
  }));

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Resource Allocation" />
        <Tab label="Workload Overview" />
        <Tab label="Capacity Planning" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          {/* Resource Allocation Summary */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Resources
                  </Typography>
                  <Typography variant="h4" component="div">
                    {allocations.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Allocation
                  </Typography>
                  <Typography variant="h4" component="div">
                    {allocations.reduce((sum, a) => sum + a.allocation_percentage, 0)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Available Capacity
                  </Typography>
                  <Typography variant="h4" component="div" color="success.main">
                    {Math.max(0, 100 - allocations.reduce((sum, a) => sum + a.allocation_percentage, 0))}%
                  </Typography>
                </CardContent>
              </Card>
            
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Active Tasks
                  </Typography>
                  <Typography variant="h4" component="div">
                    {tasks.filter(t => t.status !== 'Done').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Resource Allocation Table */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Resource Allocations
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAllocationDialogOpen(true)}
                >
                  Add Resource
                </Button>
              </Box>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Resource</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Allocation</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>End Date</TableCell>
                      <TableCell>Tasks</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allocations.map((allocation) => {
                      const userTasks = tasks.filter(t => t.assigned_to === allocation.user_id);
                      return (
                        <TableRow key={allocation.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {allocation.user.name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2">{allocation.user.name}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {allocation.user.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={allocation.role} size="small" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flexGrow: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={allocation.allocation_percentage}
                                  color={getWorkloadColor(allocation.allocation_percentage) as any}
                                  sx={{ height: 8, borderRadius: 4 }}
                                />
                              </Box>
                              <Typography variant="body2">
                                {allocation.allocation_percentage}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{new Date(allocation.start_date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(allocation.end_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">{userTasks.length}</Typography>
                              <Chip
                                label={`${userTasks.filter(t => t.status === 'Done').length} done`}
                                size="small"
                                color="success"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => setEditingAllocation(allocation)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => openDeleteDialog(allocation.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          {/* Workload Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workload Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="tasks" fill="#8884d8" name="Total Tasks" />
                  <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
                  <Bar dataKey="overdue" fill="#ff6b6b" name="Overdue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Workload Details */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Individual Workload
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Resource</TableCell>
                      <TableCell>Tasks</TableCell>
                      <TableCell>Hours</TableCell>
                      <TableCell>Allocation</TableCell>
                      <TableCell>Utilization</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {workloadData.map((item) => (
                      <TableRow key={item.user.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              {item.user.name.charAt(0)}
                            </Avatar>
                            <Typography variant="body2">{item.user.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {item.totalTasks} total
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip
                                label={`${item.completedTasks} done`}
                                size="small"
                                color="success"
                              />
                              {item.overdueTasks > 0 && (
                                <Chip
                                  label={`${item.overdueTasks} overdue`}
                                  size="small"
                                  color="error"
                                />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              Est: {item.estimatedHours}h
                            </Typography>
                            <Typography variant="body2">
                              Actual: {item.actualHours}h
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${item.allocationPercentage}%`}
                            color={getWorkloadColor(item.allocationPercentage) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={item.totalTasks > 0 ? (item.completedTasks / item.totalTasks) * 100 : 0}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                            </Box>
                            <Typography variant="body2">
                              {item.totalTasks > 0 ? Math.round((item.completedTasks / item.totalTasks) * 100) : 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Capacity Overview
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Total Team Capacity
                      </Typography>
                      <Typography variant="h4">
                        {users.length * 40}h/week
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Allocated Capacity
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {allocations.reduce((sum, a) => sum + (a.allocation_percentage * 0.4), 0)}h/week
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Available Capacity
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {Math.max(0, (users.length * 40) - allocations.reduce((sum, a) => sum + (a.allocation_percentage * 0.4), 0))}h/week
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resource Recommendations
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {workloadData
                      .filter(item => item.allocationPercentage > 80)
                      .map(item => (
                        <Alert key={item.user.id} severity="warning">
                          <Typography variant="body2">
                            <strong>{item.user.name}</strong> is over-allocated ({item.allocationPercentage}%)
                          </Typography>
                        </Alert>
                      ))}
                    {workloadData
                      .filter(item => item.overdueTasks > 0)
                      .map(item => (
                        <Alert key={item.user.id} severity="error">
                          <Typography variant="body2">
                            <strong>{item.user.name}</strong> has {item.overdueTasks} overdue tasks
                          </Typography>
                        </Alert>
                      ))}
                    {workloadData
                      .filter(item => item.allocationPercentage < 50)
                      .map(item => (
                        <Alert key={item.user.id} severity="info">
                          <Typography variant="body2">
                            <strong>{item.user.name}</strong> has available capacity ({item.allocationPercentage}%)
                          </Typography>
                        </Alert>
                      ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Allocation Form Dialog */}
      <Dialog
        open={allocationDialogOpen || !!editingAllocation}
        onClose={() => {
          setAllocationDialogOpen(false);
          setEditingAllocation(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAllocation ? 'Edit Resource Allocation' : 'Add Resource Allocation'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Resource</InputLabel>
              <Select
                value={editingAllocation?.user_id || ''}
                onChange={(e) => setEditingAllocation(prev => ({ ...prev, user_id: e.target.value } as any))}
                label="Resource"
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Role"
              value={editingAllocation?.role || ''}
              onChange={(e) => setEditingAllocation(prev => ({ ...prev, role: e.target.value } as any))}
              fullWidth
            />

            <TextField
              label="Allocation Percentage"
              type="number"
              value={editingAllocation?.allocation_percentage || ''}
              onChange={(e) => setEditingAllocation(prev => ({ ...prev, allocation_percentage: parseFloat(e.target.value) } as any))}
              fullWidth
              inputProps={{ min: 0, max: 100, step: 5 }}
              InputProps={{
                endAdornment: <Typography variant="body2">%</Typography>
              }}
            />

            <TextField
              label="Start Date"
              type="date"
              value={editingAllocation?.start_date || ''}
              onChange={(e) => setEditingAllocation(prev => ({ ...prev, start_date: e.target.value } as any))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="End Date"
              type="date"
              value={editingAllocation?.end_date || ''}
              onChange={(e) => setEditingAllocation(prev => ({ ...prev, end_date: e.target.value } as any))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAllocationDialogOpen(false);
              setEditingAllocation(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (editingAllocation) {
                handleUpdateAllocation(editingAllocation);
              } else {
                handleAddAllocation(editingAllocation);
              }
            }}
            disabled={loading}
          >
            {editingAllocation ? 'Update' : 'Add'} Allocation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to remove this resource allocation?</DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteAllocation} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourceManagement; 