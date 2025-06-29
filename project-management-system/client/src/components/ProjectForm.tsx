import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormHelperText,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import { Project, ProjectStatus } from '../types';

interface ProjectFormProps {
  onSubmit: (project: Partial<Project>) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<Project>;
  isEditing?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {},
  isEditing = false,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    start_date: initialData.start_date || '',
    end_date: initialData.end_date || '',
    scope: initialData.scope || '',
    status: initialData.status || ProjectStatus.PLANNING,
    priority: initialData.priority || 'Medium',
    budget: initialData.budget || '',
    tags: initialData.tags || [],
    newTag: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    'Basic Information',
    'Project Details',
    'Additional Settings',
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Information
        if (!formData.name.trim()) {
          newErrors.name = 'Project name is required';
        }
        if (formData.start_date && formData.end_date && new Date(formData.start_date) > new Date(formData.end_date)) {
          newErrors.end_date = 'End date must be after start date';
        }
        break;
      case 1: // Project Details
        if (!formData.description.trim()) {
          newErrors.description = 'Project description is required';
        }
        if (!formData.scope.trim()) {
          newErrors.scope = 'Project scope is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        scope: formData.scope.trim(),
        status: formData.status,
        priority: formData.priority,
        budget: formData.budget ? Number(formData.budget) : undefined,
        tags: formData.tags,
      };

      await onSubmit(projectData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the project');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addTag = () => {
    if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {isEditing ? 'Edit Project' : 'Create New Project'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                {index === 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Project Name *"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Start Date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="End Date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange('end_date', e.target.value)}
                        error={!!errors.end_date}
                        helperText={errors.end_date}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                )}

                {index === 1 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description *"
                        multiline
                        rows={4}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        error={!!errors.description}
                        helperText={errors.description}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Scope *"
                        multiline
                        rows={3}
                        value={formData.scope}
                        onChange={(e) => handleInputChange('scope', e.target.value)}
                        error={!!errors.scope}
                        helperText={errors.scope}
                        required
                      />
                    </Grid>
                  </Grid>
                )}

                {index === 2 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={formData.status}
                          label="Status"
                          onChange={(e) => handleInputChange('status', e.target.value)}
                        >
                          {Object.values(ProjectStatus).map((status) => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          value={formData.priority}
                          label="Priority"
                          onChange={(e) => handleInputChange('priority', e.target.value)}
                        >
                          {['Low', 'Medium', 'High', 'Critical'].map((priority) => (
                            <MenuItem key={priority} value={priority}>
                              {priority}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Budget"
                        type="number"
                        value={formData.budget}
                        onChange={(e) => handleInputChange('budget', e.target.value)}
                        InputProps={{
                          startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>$</Typography>,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Tags
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <TextField
                          label="Add Tag"
                          value={formData.newTag}
                          onChange={(e) => handleInputChange('newTag', e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTag()}
                          size="small"
                        />
                        <Button variant="outlined" onClick={addTag}>
                          Add
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {formData.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            onDelete={() => removeTag(tag)}
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                  <Box sx={{ flex: '1' }} />
                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                      {loading ? 'Saving...' : (isEditing ? 'Update Project' : 'Create Project')}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
      </Box>
    </Paper>
  );
};

export default ProjectForm; 