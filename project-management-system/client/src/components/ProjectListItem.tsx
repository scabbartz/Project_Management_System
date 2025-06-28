import React from 'react';
import { Project } from '../types';
import { ListItem, ListItemText, Typography, Paper, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface ProjectListItemProps {
  project: Project;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project }) => {
  return (
    <Paper elevation={2} sx={{ mb: 2 }}>
      <ListItem
        component="div"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
        }}
      >
        <ListItemText
          primary={<Typography variant="h6">{project.name}</Typography>}
          secondary={
            <>
              <Typography component="span" variant="body2" color="text.secondary">
                {project.description || 'No description available.'}
              </Typography>
              <br />
              <Typography component="span" variant="caption" color="text.secondary">
                ID: {project.id}
                {project.startDate && ` | Start: ${new Date(project.startDate).toLocaleDateString()}`}
                {project.endDate && ` | End: ${new Date(project.endDate).toLocaleDateString()}`}
              </Typography>
            </>
          }
        />
        <Button
          variant="contained"
          color="primary"
          component={RouterLink}
          to={`/projects/${project.id}`}
          sx={{ ml: 2, whiteSpace: 'nowrap' }}
        >
          View Details
        </Button>
      </ListItem>
    </Paper>
  );
};

export default ProjectListItem;
