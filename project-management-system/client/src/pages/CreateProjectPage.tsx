import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Alert } from '@mui/material';
import ProjectForm from '../components/ProjectForm';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const CreateProjectPage: React.FC = () => {
  console.log("=== CREATE PROJECT PAGE LOADED ===");
  
  const navigate = useNavigate();
  const { token, user, loading } = useAuth();

  // Fallback: get token directly from localStorage if useAuth doesn't provide it
  const tokenFromStorage = localStorage.getItem('token');
  const actualToken = token || tokenFromStorage;

  // Test function to verify token manually
  const testToken = async () => {
    console.log("=== TESTING TOKEN ===");
    const testToken = localStorage.getItem('token');
    console.log("Test token:", testToken);
    
    if (!testToken) {
      console.log("No token found in localStorage");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Test response status:", response.status);
      console.log("Test response headers:", Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log("Test successful, user data:", data);
      } else {
        const errorData = await response.json();
        console.log("Test failed, error:", errorData);
      }
    } catch (error) {
      console.error("Test request failed:", error);
    }
  };

  // Run token test on component mount
  React.useEffect(() => {
    console.log("=== COMPONENT MOUNTED ===");
    testToken();
  }, []);

  // Debug: show all localStorage keys
  React.useEffect(() => {
    const allStorageKeys = Object.keys(localStorage);
    console.log("All localStorage keys:", allStorageKeys);
    allStorageKeys.forEach(key => {
      console.log(`localStorage[${key}]:`, localStorage.getItem(key));
    });
  }, []);

  console.log("Token in CreateProjectPage:", token);
  console.log("Token from localStorage:", tokenFromStorage);
  console.log("Actual token to use:", actualToken);
  console.log("User in CreateProjectPage:", user);
  console.log("Loading in CreateProjectPage:", loading);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !actualToken) {
      console.log("No token found, redirecting to login");
      navigate('/auth');
    }
  }, [actualToken, loading, navigate]);

  const handleSubmit = async (projectData: Partial<Project>) => {
    console.log("=== HANDLE SUBMIT CALLED ===");
    if (!API_BASE_URL) {
      throw new Error("API base URL is not configured.");
    }

    if (!actualToken) {
      throw new Error("Authentication token is missing. Please log in again.");
    }

    console.log("Token at POST:", actualToken);
    console.log("Request headers:", {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${actualToken}`,
    });

    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${actualToken}`,
      },
      body: JSON.stringify(projectData),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error response:", errorData);
      throw new Error(errorData.message || `Failed to create project: ${response.status} ${response.statusText}`);
    }

    const createdProject = await response.json();
    // Navigate to the newly created project's detail page
    navigate(`/projects/${createdProject.id}`);
  };

  const handleCancel = () => {
    navigate('/projects');
  };

  // Show loading state
  if (loading) {
    console.log("=== SHOWING LOADING STATE ===");
    return (
      <Container sx={{ mt: 3, pb: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  // Show error if not authenticated
  if (!actualToken) {
    console.log("=== SHOWING AUTH ERROR ===");
    return (
      <Container sx={{ mt: 3, pb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          You must be logged in to create a project. Redirecting to login...
        </Alert>
      </Container>
    );
  }

  console.log("=== RENDERING MAIN COMPONENT ===");
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