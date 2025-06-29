import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Folder as FolderIcon,
  People as PeopleIcon,
  InsertDriveFile as FileIcon,
  Comment as CommentIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  summary: {
    projects: number;
    users: number;
    files: number;
    comments: number;
  };
  recentActivity: {
    projects: number;
    files: number;
    comments: number;
  };
  topProjects: Array<{
    name: string;
    file_count: number;
    comment_count: number;
  }>;
}

interface ProjectStats {
  totalProjects: number;
  recentProjects: number;
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

interface UserStats {
  totalUsers: number;
  recentUsers: number;
  byRole: Array<{ role: string; count: number }>;
  mostActive: Array<{ name: string; project_count: number }>;
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  recentUploads: number;
  byType: Array<{ category: string; count: number; total_size: number }>;
  monthlyTrend: Array<{ month: string; count: number; totalSize: number }>;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const DashboardPage: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [fileStats, setFileStats] = useState<FileStats | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewRes, projectsRes, usersRes, filesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/analytics/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/analytics/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/analytics/files`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (overviewRes.ok && projectsRes.ok && usersRes.ok && filesRes.ok) {
        const [overview, projects, users, files] = await Promise.all([
          overviewRes.json(),
          projectsRes.json(),
          usersRes.json(),
          filesRes.json()
        ]);

        setDashboardStats(overview);
        setProjectStats(projects);
        setUserStats(users);
        setFileStats(files);
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Planning": return "default";
      case "Active": return "success";
      case "On Hold": return "warning";
      case "Completed": return "info";
      case "Cancelled": return "error";
      default: return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Low": return "success";
      case "Medium": return "warning";
      case "High": return "error";
      case "Critical": return "error";
      default: return "default";
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your project management system
        </Typography>
      </Box>

      {/* Summary Cards */}
      {dashboardStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <FolderIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{dashboardStats.summary.projects}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Projects
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                    <PeopleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{dashboardStats.summary.users}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Users
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <FileIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{dashboardStats.summary.files}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Files
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                    <CommentIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{dashboardStats.summary.comments}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Comments
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Recent Activity */}
      {dashboardStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Recent Activity (Last 7 Days)" />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <FolderIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${dashboardStats.recentActivity.projects} new projects`}
                      secondary="Created in the last 7 days"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <FileIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${dashboardStats.recentActivity.files} files uploaded`}
                      secondary="Uploaded in the last 7 days"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'info.main' }}>
                        <CommentIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${dashboardStats.recentActivity.comments} comments added`}
                      secondary="Added in the last 7 days"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Top Projects" />
              <CardContent>
                <List>
                  {dashboardStats.topProjects.map((project, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={project.name}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip
                              label={`${project.file_count} files`}
                              size="small"
                              color="success"
                            />
                            <Chip
                              label={`${project.comment_count} comments`}
                              size="small"
                              color="info"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Detailed Analytics Tabs */}
      <Card>
        <CardHeader title="Detailed Analytics" />
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Projects" />
            <Tab label="Users" />
            <Tab label="Files" />
          </Tabs>
        </Box>

        {/* Projects Tab */}
        {activeTab === 0 && projectStats && (
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Projects by Status</Typography>
                <List>
                  {projectStats.byStatus.map((item) => (
                    <ListItem key={item.status}>
                      <ListItemText
                        primary={item.status}
                        secondary={`${item.count} projects`}
                      />
                      <Chip
                        label={item.count}
                        color={getStatusColor(item.status)}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Projects by Priority</Typography>
                <List>
                  {projectStats.byPriority.map((item) => (
                    <ListItem key={item.priority}>
                      <ListItemText
                        primary={item.priority}
                        secondary={`${item.count} projects`}
                      />
                      <Chip
                        label={item.count}
                        color={getPriorityColor(item.priority)}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Users Tab */}
        {activeTab === 1 && userStats && (
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Users by Role</Typography>
                <List>
                  {userStats.byRole.map((item) => (
                    <ListItem key={item.role}>
                      <ListItemText
                        primary={item.role}
                        secondary={`${item.count} users`}
                      />
                      <Chip label={item.count} size="small" />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Most Active Users</Typography>
                <List>
                  {userStats.mostActive.map((user, index) => (
                    <ListItem key={index}>
                      <ListItemAvatar>
                        <Avatar>{user.name.charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name}
                        secondary={`${user.project_count} projects created`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Files Tab */}
        {activeTab === 2 && fileStats && (
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Files by Type</Typography>
                <List>
                  {fileStats.byType.map((item) => (
                    <ListItem key={item.category}>
                      <ListItemText
                        primary={item.category}
                        secondary={`${item.count} files (${formatFileSize(item.total_size)})`}
                      />
                      <Chip label={item.count} size="small" />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Storage Summary</Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body1">
                    Total Files: {fileStats.totalFiles}
                  </Typography>
                  <Typography variant="body1">
                    Total Size: {formatFileSize(fileStats.totalSize)}
                  </Typography>
                  <Typography variant="body1">
                    Recent Uploads: {fileStats.recentUploads} (last 30 days)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        )}
      </Card>
    </Container>
  );
};

export default DashboardPage; 