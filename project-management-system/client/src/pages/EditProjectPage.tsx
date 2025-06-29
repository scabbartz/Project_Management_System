import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import ProjectForm from '../components/ProjectForm';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const EditProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
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
        const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
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

    fetchProject();
  }, [id, token]);

  const handleSubmit = async (projectData: Partial<Project>) => {
    if (!id || !API_BASE_URL) {
      throw new Error("Project ID or API base URL is not available.");
    }

    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to update project: ${response.status} ${response.statusText}`);
    }

    const updatedProject = await response.json();
    // Navigate to the updated project's detail page
    navigate(`/projects/${updatedProject.id}`);
  };

  const handleCancel = () => {
    navigate(`/projects/${id}`);
  };

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
          <Typography gutterBottom>Error loading project: {error}</Typography>
        </Alert>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container sx={{mt: 4}}>
        <Alert severity="warning">Project data is not available.</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 3, pb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Project
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Update the project details below. All fields marked with * are required.
        </Typography>
      </Box>

      <ProjectForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={project}
        isEditing={true}
      />
    </Container>
  );
};

export default EditProjectPage; 