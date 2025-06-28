import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import ProjectListItem from '../ProjectListItem';
import { Project } from '../../types';

const mockProject: Project = {
  id: '1',
  name: 'Test Project Item',
  description: 'This is a description for the test project item.',
  startDate: '2024-03-01',
  endDate: '2024-09-30',
};

const mockProjectMinimal: Project = {
  id: '2',
  name: 'Minimal Project Item',
};

describe('ProjectListItem', () => {
  it('renders project details correctly', () => {
    render(
      <Router>
        <ProjectListItem project={mockProject} />
      </Router>
    );

    expect(screen.getByText('Test Project Item')).toBeInTheDocument();
    expect(screen.getByText('This is a description for the test project item.')).toBeInTheDocument();
    expect(screen.getByText(/ID: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Start:.*3\/1\/2024/)).toBeInTheDocument(); // Flexible date match
    expect(screen.getByText(/End:.*9\/30\/2024/)).toBeInTheDocument();  // Flexible date match
    expect(screen.getByRole('link', { name: /View Details/i })).toHaveAttribute('href', '/projects/1');
  });

  it('renders minimal project details correctly', () => {
    render(
      <Router>
        <ProjectListItem project={mockProjectMinimal} />
      </Router>
    );

    expect(screen.getByText('Minimal Project Item')).toBeInTheDocument();
    expect(screen.getByText('No description available.')).toBeInTheDocument(); // Default description
    expect(screen.getByText(/ID: 2/)).toBeInTheDocument();
    // Check that dates are not rendered if not provided
    expect(screen.queryByText(/Start:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/End:/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Details/i })).toHaveAttribute('href', '/projects/2');
  });

  it('has a link to the project detail page', () => {
    render(
      <Router>
        <ProjectListItem project={mockProject} />
      </Router>
    );
    const linkElement = screen.getByRole('link', { name: /View Details/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', `/projects/${mockProject.id}`);
  });
});
