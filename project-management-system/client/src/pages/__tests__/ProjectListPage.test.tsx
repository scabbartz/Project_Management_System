import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import ProjectListPage from '../ProjectListPage';
import { Project } from '../../types';

// Mock the fetch function
global.fetch = jest.fn();

const mockProjects: Project[] = [
  { id: '1', name: 'Project Alpha', description: 'Description for Alpha' },
  { id: '2', name: 'Project Beta', description: 'Description for Beta', startDate: '2024-01-01', endDate: '2024-06-30' },
];

const mockFetch = (data: any, ok = true, status = 200) => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
    statusText: ok ? 'OK' : 'Error',
  });
};

// Mock environment variable
const OLD_ENV = process.env;

beforeEach(() => {
  jest.resetModules(); // Most important - it clears the cache
  process.env = { ...OLD_ENV }; // Make a copy
  (fetch as jest.Mock).mockClear(); // Clear fetch mock history
  process.env.REACT_APP_API_BASE_URL = 'http://localhost:3001/api';
});

afterAll(() => {
  process.env = OLD_ENV; // Restore old environment
});

describe('ProjectListPage', () => {
  it('renders loading state initially', () => {
    mockFetch(new Promise(() => {})); // Keep fetch pending
    render(<Router><ProjectListPage /></Router>);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders list of projects on successful fetch', async () => {
    mockFetch(mockProjects);
    render(<Router><ProjectListPage /></Router>);

    expect(await screen.findByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Description for Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('Description for Beta')).toBeInTheDocument();
  });

  it('renders error message on fetch failure', async () => {
    mockFetch({ message: 'Failed to fetch' }, false, 500);
    render(<Router><ProjectListPage /></Router>);

    expect(await screen.findByText(/Error loading projects/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch projects: 500 Error/i)).toBeInTheDocument();
  });

  it('renders "No projects found" when API returns empty array', async () => {
    mockFetch([]);
    render(<Router><ProjectListPage /></Router>);
    expect(await screen.findByText('No projects found. Start by creating a new project.')).toBeInTheDocument();
  });

  it('handles API_BASE_URL not being configured', async () => {
    delete process.env.REACT_APP_API_BASE_URL; // Unset the env variable
     render(<Router><ProjectListPage /></Router>);
    expect(await screen.findByText(/Error loading projects: API base URL is not configured./i)).toBeInTheDocument();
  });
});
