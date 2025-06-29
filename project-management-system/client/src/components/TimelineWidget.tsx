import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { TimelineStats } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const TimelineWidget: React.FC = () => {
  const { token } = useAuth();
  const [timelineStats, setTimelineStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelineStats();
  }, []);

  const fetchTimelineStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/timeline/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTimelineStats(data);
      } else {
        throw new Error('Failed to fetch timeline stats');
      }
    } catch (err) {
      setError('Failed to load timeline statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntil = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'error';
    if (daysUntil <= 1) return 'warning';
    if (daysUntil <= 3) return 'info';
    return 'success';
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!timelineStats) {
    return (
      <Card>
        <CardContent>
          <Typography>No timeline data available</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Timeline Overview"
        action={
          <Button size="small" onClick={fetchTimelineStats}>
            Refresh
          </Button>
        }
      />
      <CardContent>
        {/* Upcoming Deadlines */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon color="primary" />
            Upcoming Deadlines
          </Typography>
          
          {timelineStats.upcomingDeadlines.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No upcoming deadlines
            </Typography>
          ) : (
            <List dense>
              {timelineStats.upcomingDeadlines.slice(0, 5).map((item) => {
                const daysUntil = getDaysUntil(item.due_date);
                return (
                  <ListItem key={`${item.type}-${item.id}`} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {item.type === 'milestone' ? <FlagIcon /> : <AssignmentIcon />}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.project_name} • ${formatDate(item.due_date)}`}
                    />
                    <Chip
                      label={`${daysUntil > 0 ? `${daysUntil}d` : 'Today'}`}
                      color={getUrgencyColor(daysUntil)}
                      size="small"
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Overdue Items */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            Overdue Items
          </Typography>
          
          {timelineStats.overdueItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No overdue items
            </Typography>
          ) : (
            <List dense>
              {timelineStats.overdueItems.slice(0, 5).map((item) => (
                <ListItem key={`overdue-${item.type}-${item.id}`} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {item.type === 'milestone' ? <FlagIcon color="error" /> : <AssignmentIcon color="error" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    secondary={`${item.project_name} • ${formatDate(item.due_date)}`}
                  />
                  <Chip
                    label={`${item.days_overdue}d overdue`}
                    color="error"
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Recent Progress */}
        <Box>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon color="success" />
            Recent Progress
          </Typography>
          
          {timelineStats.recentProgress.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recent progress updates
            </Typography>
          ) : (
            <List dense>
              {timelineStats.recentProgress.slice(0, 3).map((item) => (
                <ListItem key={`progress-${item.project_id}`} sx={{ px: 0 }}>
                  <ListItemText
                    primary={item.project_name}
                    secondary={`${item.progress}% complete • ${formatDate(item.updated_at)}`}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.progress}%
                    </Typography>
                    <Box
                      sx={{
                        width: 40,
                        height: 4,
                        bgcolor: 'grey.200',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${item.progress}%`,
                          height: '100%',
                          bgcolor: 'success.main',
                        }}
                      />
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TimelineWidget; 