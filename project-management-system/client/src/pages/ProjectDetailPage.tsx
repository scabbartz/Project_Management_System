import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { Project, ProjectStatus } from '../types';
import { 
  Container, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert, 
  Paper, 
  Grid, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
} from '@mui/icons-material';
import { useAuth } from "../contexts/AuthContext";
import FileUpload from "../components/FileUpload";
import Comments from "../components/Comments";
import TimelineView from '../components/TimelineView';
import BudgetOverview from '../components/BudgetOverview';
import ResourceManagement from '../components/ResourceManagement';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001/api";

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [budgetData, setBudgetData] = useState<any>(null);

  const fetchProject = async () => {
    if (!id) {
      setError("No project ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Project not found (ID: ${id})`);
        }
        throw new Error(`Failed to fetch project: ${response.status} ${response.statusText}`);
      }
      const data: Project = await response.json();
      setProject(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error(`Error fetching project ${id}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetData = async () => {
    if (!id) return;
    try {
      const response = await fetch(`${API_BASE_URL}/budget/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBudgetData(data);
      }
    } catch (error) {
      console.error('Failed to fetch budget data:', error);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchBudgetData();
  }, [id, token]);

  const openDeleteDialog = () => setDeleteDialogOpen(true);
  const closeDeleteDialog = () => setDeleteDialogOpen(false);

  const handleDelete = async () => {
    if (!project) return;

    try {
      setDeleting(true);
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        navigate("/");
      } else {
        throw new Error("Failed to delete project");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Planning':
        return 'default';
      case 'Active':
        return 'primary';
      case 'On Hold':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Low':
        return 'success';
      case 'Medium':
        return 'primary';
      case 'High':
        return 'warning';
      case 'Critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const canEdit = project && (
    project.created_by === user?.id || 
    ['Admin', 'Manager'].includes(user?.role || '')
  );

  const canDelete = project && (
    project.created_by === user?.id || 
    user?.role === 'Admin'
  );

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportPDF = () => {
    if (project) {
      const url = `${API_BASE_URL}/export/projects/${project.id}/pdf`;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `project_${project.id}_report.pdf`);
      link.setAttribute('Authorization', `Bearer ${token}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    handleExportMenuClose();
  };

  const handleExportCSV = () => {
    const url = `${API_BASE_URL}/export/projects/csv`;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'projects_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleExportMenuClose();
  };

  const handleRefresh = () => {
    fetchProject();
    fetchBudgetData();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Project not found'}
        </Alert>
        <Button
          component={RouterLink}
          to="/"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
        >
          Back to Projects
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              sx={{ mb: 2 }}
            >
              Back to Projects
            </Button>
            <Typography variant="h4" component="h1" gutterBottom>
              {project.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Project ID: {project.id}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportMenuOpen}
            >
              Export
            </Button>
            <IconButton onClick={handleExportMenuOpen}>
              <MoreVertIcon />
            </IconButton>
            
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={handleExportMenuClose}
            >
              <MenuItem onClick={handleExportPDF}>
                <ListItemIcon>
                  <PdfIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Export as PDF</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleExportCSV}>
                <ListItemIcon>
                  <CsvIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Export as CSV</ListItemText>
              </MenuItem>
            </Menu>

            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/projects/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={openDeleteDialog}
            >
              Delete
            </Button>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />

        {/* Project Details Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Overview" />
            <Tab label="Timeline" />
            <Tab label="Budget" />
            <Tab label="Resources" />
            <Tab label="Files" />
            <Tab label="Comments" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        {activeTab === 0 && (
          <Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Details</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="ID" secondary={project.id} />
                  </ListItem>
                  {project.start_date && (
                    <ListItem>
                      <ListItemText primary="Start Date" secondary={new Date(project.start_date).toLocaleDateString()} />
                    </ListItem>
                  )}
                  {project.end_date && (
                    <ListItem>
                      <ListItemText primary="End Date" secondary={new Date(project.end_date).toLocaleDateString()} />
                    </ListItem>
                  )}
                  {project.status && (
                    <ListItem>
                      <ListItemText 
                        primary="Status" 
                        secondary={
                          <Chip 
                            label={project.status} 
                            color={getStatusColor(project.status) as any}
                            size="small"
                          />
                        } 
                      />
                    </ListItem>
                  )}
                  {project.priority && (
                    <ListItem>
                      <ListItemText 
                        primary="Priority" 
                        secondary={
                          <Chip 
                            label={project.priority} 
                            color={getPriorityColor(project.priority) as any}
                            size="small"
                          />
                        } 
                      />
                    </ListItem>
                  )}
                  {project.budget && (
                    <ListItem>
                      <ListItemText primary="Budget" secondary={`$${project.budget.toLocaleString()}`} />
                    </ListItem>
                  )}
                  {project.actual_cost && (
                    <ListItem>
                      <ListItemText primary="Actual Cost" secondary={`$${project.actual_cost.toLocaleString()}`} />
                    </ListItem>
                  )}
                  {project.budget_status && (
                    <ListItem>
                      <ListItemText 
                        primary="Budget Status" 
                        secondary={
                          <Chip 
                            label={project.budget_status} 
                            color={project.budget_status === 'Over Budget' ? 'error' : project.budget_status === 'On Budget' ? 'warning' : 'success'}
                            size="small"
                          />
                        } 
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                {project.tags && project.tags.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Tags</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {project.tags.map((tag, index) => (
                        <Chip key={index} label={tag} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}
              </Grid>

              {project.description && (
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{mt: 2}}>Description</Typography>
                  <Typography variant="body1" sx={{whiteSpace: 'pre-wrap'}}>{project.description}</Typography>
                </Grid>
              )}

              {project.scope && (
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{mt: 2}}>Scope</Typography>
                  <Typography variant="body1" sx={{whiteSpace: 'pre-wrap'}}>{project.scope}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}

        {/* Timeline Tab */}
        {activeTab === 1 && project && (
          <TimelineView project={project} onUpdate={handleRefresh} />
        )}

        {/* Budget Tab */}
        {activeTab === 2 && project && budgetData && (
          <BudgetOverview 
            projectId={parseInt(id!)} 
            budgetData={budgetData} 
            onRefresh={handleRefresh} 
          />
        )}

        {/* Resources Tab */}
        {activeTab === 3 && project && (
          <ResourceManagement 
            projectId={parseInt(id!)} 
            onRefresh={handleRefresh} 
          />
        )}

        {/* Files Tab */}
        {activeTab === 4 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Project Files
            </Typography>
            <FileUpload projectId={id!} onFileUploaded={handleRefresh} />
          </Box>
        )}

        {/* Comments Tab */}
        {activeTab === 5 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Project Comments
            </Typography>
            <Comments projectId={id!} />
          </Box>
        )}
      </Paper>
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>Are you sure you want to delete this project?</DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectDetailPage;
