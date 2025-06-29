import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';
import ProjectForm from '../components/ProjectForm';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  console.log("Token in CreateProjectPage:", token);

  const handleSubmit = async (projectData: Partial<Project>) => {
    if (!API_BASE_URL) {
      throw new Error("API base URL is not configured.");
    }

    console.log("Token at POST:", token);

    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to create project: ${response.status} ${response.statusText}`);
    }

    const createdProject = await response.json();
    // Navigate to the newly created project's detail page
    navigate(`/projects/${createdProject.id}`);
  };

  const handleCancel = () => {
    navigate('/projects');
  };

  return (
    <Container sx={{ mt: 3, pb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Project
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Fill out the form below to create a new project for the sports department.
        </Typography>
      </Box>

      <ProjectForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEditing={false}
      />
    </Container>
  );
};

export default CreateProjectPage; 