import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Comment as CommentIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SearchBar from '../components/SearchBar';

interface SearchResult {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  createdBy?: string;
  createdAt?: string;
  type: 'project' | 'file' | 'comment';
}

interface SearchResults {
  projects: SearchResult[];
  files: SearchResult[];
  comments: SearchResult[];
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = useAuth();
  const [results, setResults] = useState<SearchResults>({ projects: [], files: [], comments: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';

  useEffect(() => {
    if (query) {
      performSearch(query, {
        type,
        status: searchParams.get('status') || '',
        priority: searchParams.get('priority') || '',
        dateFrom: searchParams.get('dateFrom') || '',
        dateTo: searchParams.get('dateTo') || '',
      });
    }
  }, [query, type, searchParams]);

  const performSearch = async (searchQuery: string, filters: any) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        q: searchQuery,
        ...filters,
      });

      const response = await fetch(`${API_BASE_URL}/search?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || { projects: [], files: [], comments: [] });
      } else {
        throw new Error('Search failed');
      }
    } catch (err) {
      setError('Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery: string, filters: any) => {
    const newParams = new URLSearchParams();
    newParams.set('q', searchQuery);
    
    if (filters.type) newParams.set('type', filters.type);
    if (filters.status) newParams.set('status', filters.status);
    if (filters.priority) newParams.set('priority', filters.priority);
    if (filters.dateFrom) newParams.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) newParams.set('dateTo', filters.dateTo);

    setSearchParams(newParams);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const totalResults = results.projects.length + results.files.length + results.comments.length;

  return (
    <Container sx={{ mt: 4, pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Search Results
        </Typography>
        {query && (
          <Typography variant="body1" color="text.secondary">
            Found {totalResults} results for "{query}"
          </Typography>
        )}
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <SearchBar onSearch={handleSearch} />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Results */}
      {!loading && query && (
        <Box>
          {/* Results Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab 
                label={`Projects (${results.projects.length})`} 
                icon={<FolderIcon />} 
                iconPosition="start"
              />
              <Tab 
                label={`Files (${results.files.length})`} 
                icon={<FileIcon />} 
                iconPosition="start"
              />
              <Tab 
                label={`Comments (${results.comments.length})`} 
                icon={<CommentIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Projects Tab */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {results.projects.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No projects found matching your search.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                results.projects.map((project) => (
                  <Grid item xs={12} md={6} lg={4} key={project.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {project.name}
                        </Typography>
                        {project.description && (
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {project.description.substring(0, 100)}
                            {project.description.length > 100 && '...'}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          {project.status && (
                            <Chip
                              label={project.status}
                              color={getStatusColor(project.status)}
                              size="small"
                            />
                          )}
                          {project.priority && (
                            <Chip
                              label={project.priority}
                              color={getPriorityColor(project.priority)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Created by {project.createdBy} on {formatDate(project.createdAt || '')}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          View Project
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {/* Files Tab */}
          {activeTab === 1 && (
            <List>
              {results.files.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No files found matching your search.
                  </Typography>
                </Paper>
              ) : (
                results.files.map((file) => (
                  <ListItem key={file.id} divider>
                    <ListItemAvatar>
                      <Avatar>
                        <FileIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={file.name}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          File found in search results
                        </Typography>
                      }
                    />
                    <IconButton
                      onClick={() => {
                        // Handle file download
                        window.open(`${API_BASE_URL}/files/download/${file.id}`, '_blank');
                      }}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </ListItem>
                ))
              )}
            </List>
          )}

          {/* Comments Tab */}
          {activeTab === 2 && (
            <List>
              {results.comments.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No comments found matching your search.
                  </Typography>
                </Paper>
              ) : (
                results.comments.map((comment) => (
                  <ListItem key={comment.id} divider>
                    <ListItemAvatar>
                      <Avatar>
                        <CommentIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={comment.name || 'Comment'}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Comment found in search results
                        </Typography>
                      }
                    />
                  </ListItem>
                ))
              )}
            </List>
          )}
        </Box>
      )}

      {/* No Search Query */}
      {!loading && !query && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Start Your Search
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the search bar above to find projects, files, and comments.
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default SearchResultsPage; 