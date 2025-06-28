import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import ProjectListItem from '../components/ProjectListItem';
import { Container, Typography, Box, CircularProgress, Alert, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // Assuming we'll add a create project button later

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ProjectListPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!API_BASE_URL) {
          throw new Error("API base URL is not configured.");
        }
        const response = await fetch(`${API_BASE_URL}/projects`);
        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
        }
        const data: Project[] = await response.json();
        setProjects(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred.');
        }
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

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
          <Typography>Error loading projects: {error}</Typography>
          <Button onClick={() => window.location.reload()} sx={{mt: 1}}>Try Again</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Projects
        </Typography>
        {/* Placeholder for Add Project Button - to be implemented later */}
        {/* <Button variant="contained" color="primary" component={RouterLink} to="/projects/new">
          Create Project
        </Button> */}
      </Box>
      {projects.length === 0 ? (
        <Typography>No projects found. Start by creating a new project.</Typography>
      ) : (
        projects.map(project => (
          <ProjectListItem key={project.id} project={project} />
        ))
      )}
    </Container>
  );
};

export default ProjectListPage;
