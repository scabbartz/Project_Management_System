import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
  showFilters?: boolean;
}

interface SearchFilters {
  type: string;
  status: string;
  priority: string;
  dateFrom: string;
  dateTo: string;
}

interface SearchSuggestion {
  type: 'project' | 'tag';
  value: string;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Search projects, files, and comments...",
  showFilters = true 
}) => {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: '',
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch search suggestions
  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/search/suggestions?q=${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, [token]);

  // Debounced search suggestions
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (query.trim().length >= 2) {
      const timer = setTimeout(() => {
        fetchSuggestions(query.trim());
      }, 300);
      setDebounceTimer(timer);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [query, fetchSuggestions]);

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim(), filters);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery('');
    setFilters({
      type: '',
      status: '',
      priority: '',
      dateFrom: '',
      dateTo: '',
    });
    setSuggestions([]);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion | null) => {
    if (suggestion) {
      setQuery(suggestion.value);
      handleSearch();
    }
  };

  const applyFilters = () => {
    setShowFilterDialog(false);
    if (query.trim()) {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      priority: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SearchIcon sx={{ color: 'text.secondary' }} />
        
        <Autocomplete
          freeSolo
          options={suggestions}
          getOptionLabel={(option) => 
            typeof option === 'string' ? option : option.value
          }
          inputValue={query}
          onInputChange={(event, newValue) => setQuery(newValue)}
          onChange={(event, newValue) => handleSuggestionSelect(newValue as SearchSuggestion)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={placeholder}
              variant="standard"
              fullWidth
              onKeyPress={handleKeyPress}
              sx={{ flexGrow: 1 }}
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={option.type} 
                  size="small" 
                  color={option.type === 'project' ? 'primary' : 'secondary'}
                />
                <Typography>{option.value}</Typography>
              </Box>
            </Box>
          )}
        />

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>

        {showFilters && (
          <IconButton
            onClick={() => setShowFilterDialog(true)}
            color={hasActiveFilters ? 'primary' : 'default'}
          >
            <FilterIcon />
          </IconButton>
        )}

        {(query || hasActiveFilters) && (
          <IconButton onClick={handleClear}>
            <ClearIcon />
          </IconButton>
        )}
      </Paper>

      {/* Filter Dialog */}
      <Dialog
        open={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Search Filters</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Search Type</InputLabel>
              <Select
                value={filters.type}
                label="Search Type"
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="projects">Projects</MenuItem>
                <MenuItem value="files">Files</MenuItem>
                <MenuItem value="comments">Comments</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Planning">Planning</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="On Hold">On Hold</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                label="Priority"
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Date To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={clearFilters}>Clear Filters</Button>
          <Button onClick={() => setShowFilterDialog(false)}>Cancel</Button>
          <Button onClick={applyFilters} variant="contained">Apply</Button>
        </DialogActions>
      </Dialog>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {filters.type && (
            <Chip
              label={`Type: ${filters.type}`}
              onDelete={() => setFilters(prev => ({ ...prev, type: '' }))}
              size="small"
            />
          )}
          {filters.status && (
            <Chip
              label={`Status: ${filters.status}`}
              onDelete={() => setFilters(prev => ({ ...prev, status: '' }))}
              size="small"
            />
          )}
          {filters.priority && (
            <Chip
              label={`Priority: ${filters.priority}`}
              onDelete={() => setFilters(prev => ({ ...prev, priority: '' }))}
              size="small"
            />
          )}
          {filters.dateFrom && (
            <Chip
              label={`From: ${filters.dateFrom}`}
              onDelete={() => setFilters(prev => ({ ...prev, dateFrom: '' }))}
              size="small"
            />
          )}
          {filters.dateTo && (
            <Chip
              label={`To: ${filters.dateTo}`}
              onDelete={() => setFilters(prev => ({ ...prev, dateTo: '' }))}
              size="small"
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default SearchBar; 