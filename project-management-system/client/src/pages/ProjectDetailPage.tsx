import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Project } from '../types';
import { Container, Typography, Box, CircularProgress, Alert, Paper, Grid, Button, List, ListItem, ListItemText, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) {
        setError("No project ID provided.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (!API_BASE_URL) {
          throw new Error("API base URL is not configured.");
        }
        const response = await fetch(`${API_BASE_URL}/projects/${id}`);
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

    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{mt: 4}}>
        <Alert severity="error">
          <Typography gutterBottom>Error loading project details: {error}</Typography>
          <Button component={RouterLink} to="/projects" variant="outlined" startIcon={<ArrowBackIcon />}>
            Back to Projects
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container sx={{mt: 4}}>
        <Alert severity="warning">Project data is not available.</Alert>
         <Button component={RouterLink} to="/projects" variant="outlined" startIcon={<ArrowBackIcon />} sx={{mt: 2}}>
            Back to Projects
          </Button>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 3 }}>
      <Button component={RouterLink} to="/projects" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Project List
      </Button>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {project.name}
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6">Details</Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="ID" secondary={project.id} />
              </ListItem>
              {project.startDate && (
                <ListItem>
                  <ListItemText primary="Start Date" secondary={new Date(project.startDate).toLocaleDateString()} />
                </ListItem>
              )}
              {project.endDate && (
                <ListItem>
                  <ListItemText primary="End Date" secondary={new Date(project.endDate).toLocaleDateString()} />
                </ListItem>
              )}
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            {/* Placeholder for other details like status, team members etc. */}
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

          {project.objectives && project.objectives.length > 0 && (
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{mt: 2}}>Objectives</Typography>
              <List dense>
                {project.objectives.map((obj, index) => (
                  <ListItem key={`obj-${index}`}>
                    <ListItemText primary={`• ${obj}`} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}

          {project.deliverables && project.deliverables.length > 0 && (
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{mt: 2}}>Deliverables</Typography>
              <List dense>
                {project.deliverables.map((del, index) => (
                  <ListItem key={`del-${index}`}>
                    <ListItemText primary={`• ${del}`} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}
        </Grid>
        {/* Placeholder for Edit/Delete buttons or other actions */}
        {/* <Box sx={{mt: 3, display: 'flex', gap: 1}}>
            <Button variant="contained" color="secondary">Edit Project</Button>
            <Button variant="outlined" color="error">Delete Project</Button>
        </Box> */}
      </Paper>
    </Container>
  );
};

export default ProjectDetailPage;
