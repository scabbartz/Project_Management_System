import React from 'react';
import { Project, ProjectStatus } from '../types';
import { ListItem, ListItemText, Typography, Paper, Button, Box, Chip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface ProjectListItemProps {
  project: Project;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project }) => {
  const getStatusColor = (status?: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return 'default';
      case ProjectStatus.ACTIVE:
        return 'primary';
      case ProjectStatus.ON_HOLD:
        return 'warning';
      case ProjectStatus.COMPLETED:
        return 'success';
      case ProjectStatus.CANCELLED:
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

  return (
    <Paper elevation={2} sx={{ mb: 2 }}>
      <ListItem
        component="div"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          p: 2,
        }}
      >
        <Box sx={{ flex: 1, mr: 2 }}>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6">{project.name}</Typography>
                {project.status && (
                  <Chip 
                    label={project.status} 
                    color={getStatusColor(project.status as ProjectStatus) as any}
                    size="small"
                  />
                )}
                {project.priority && (
                  <Chip 
                    label={project.priority} 
                    color={getPriorityColor(project.priority) as any}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            }
            secondary={
              <Box>
                <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {project.description || 'No description available.'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography component="span" variant="caption" color="text.secondary">
                    ID: {project.id}
                  </Typography>
                  {project.start_date && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      Start: {new Date(project.start_date).toLocaleDateString()}
                    </Typography>
                  )}
                  {project.end_date && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      End: {new Date(project.end_date).toLocaleDateString()}
                    </Typography>
                  )}
                  {project.budget && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      Budget: ${project.budget.toLocaleString()}
                    </Typography>
                  )}
                </Box>
                {project.tags && project.tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {project.tags.slice(0, 3).map((tag, index) => (
                      <Chip 
                        key={index} 
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    ))}
                    {project.tags.length > 3 && (
                      <Chip 
                        label={`+${project.tags.length - 3} more`} 
                        size="small" 
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            }
          />
        </Box>
        <Button
          variant="contained"
          color="primary"
          component={RouterLink}
          to={`/projects/${project.id}`}
          sx={{ whiteSpace: 'nowrap', ml: 2 }}
        >
          View Details
        </Button>
      </ListItem>
    </Paper>
  );
};

export default ProjectListItem;
