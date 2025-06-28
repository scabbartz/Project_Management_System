import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Container, Typography, Box, AppBar, Toolbar, Button } from "@mui/material";

import ProjectListPage from "./pages/ProjectListPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";

function HomePageComponent() {
  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to the Project Management System
      </Typography>
      <Typography variant="body1" paragraph>
        This is the central hub for managing all your sports department projects.
        Navigate to the projects section to view existing projects or create new ones.
      </Typography>
      <Typography variant="caption" display="block">
        API Base URL for client: {process.env.REACT_APP_API_BASE_URL || "Not set, check .env file"}
      </Typography>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Khelo Tech - PMS
          </Typography>
          <Button color="inherit" component={Link} to="/">Home</Button>
          <Button color="inherit" component={Link} to="/projects">Projects</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{mt: 2, pb: 4}}> {/* Added padding bottom for better spacing */}
        <Routes>
          <Route path="/" element={<HomePageComponent />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          {/* Later, we can add a /projects/new route for creating projects */}
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
