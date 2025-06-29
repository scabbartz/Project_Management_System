import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProjectListPage from './pages/ProjectListPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import CreateProjectPage from './pages/CreateProjectPage';
import EditProjectPage from './pages/EditProjectPage';
import AuthPage from './pages/AuthPage';
import SearchResultsPage from './pages/SearchResultsPage';
import DashboardPage from './pages/DashboardPage';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
};

// Navigation Component
const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const isAuthenticated = !!user;

  if (!isAuthenticated) return null;

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Khelo Tech PMS
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button color="inherit" href="/dashboard">
            Dashboard
          </Button>
          <Button color="inherit" href="/projects">
            Projects
          </Button>
          <Button color="inherit" href="/search">
            Search
          </Button>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.name}
          </Typography>
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

// Main App Component
const AppContent: React.FC = () => {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/projects" replace />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/projects" : "/auth"} replace />} />
        
        {/* Protected Routes */}
        <Route path="/projects" element={
          <ProtectedRoute>
            <ProjectListPage />
          </ProtectedRoute>
        } />
        <Route path="/projects/:id" element={
          <ProtectedRoute>
            <ProjectDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/projects/create" element={
          <ProtectedRoute>
            <CreateProjectPage />
          </ProtectedRoute>
        } />
        <Route path="/projects/:id/edit" element={
          <ProtectedRoute>
            <EditProjectPage />
          </ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute>
            <SearchResultsPage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
};

// Root App Component with Providers
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
