import request from 'supertest';
import express, { Express } from 'express';
import projectRoutes from '../projectRoutes'; // Adjust path as necessary

// Mock the Express app
const app: Express = express();
app.use(express.json());
app.use('/api/projects', projectRoutes); // Assuming this is how routes are setup in your main app

describe('Project API Routes', () => {
  // Mock data store or clear it before each test
  // For in-memory store, you might need to export and modify it or mock its module

  describe('GET /api/projects', () => {
    it('should return an empty array initially', async () => {
      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    // Add more tests for GET all projects (e.g., after adding some projects)
  });

  describe('POST /api/projects', () => {
    it('should create a new project and return it', async () => {
      const newProjectData = {
        name: 'Test Project 1',
        description: 'This is a test project.',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        scope: 'Test scope',
        objectives: ['Objective 1'],
        deliverables: ['Deliverable 1'],
      };
      const response = await request(app)
        .post('/api/projects')
        .send(newProjectData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(newProjectData.name);
      expect(response.body.id).toBeDefined();
      // Further checks for other properties
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ description: 'Missing name' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Project name is required');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return 404 for a non-existent project ID', async () => {
      const response = await request(app).get('/api/projects/nonexistentid');
      expect(response.status).toBe(404);
    });

    // Add test for successfully fetching an existing project
  });

  describe('PUT /api/projects/:id', () => {
    it('should return 404 when trying to update a non-existent project', async () => {
      const response = await request(app)
        .put('/api/projects/nonexistentid')
        .send({ name: 'Updated Name' });
      expect(response.status).toBe(404);
    });

    // Add test for successfully updating an existing project
    // Add test for returning 400 if name is made empty during update
  });

  describe('DELETE /api/projects/:id', () => {
    it('should return 404 when trying to delete a non-existent project', async () => {
      const response = await request(app).delete('/api/projects/nonexistentid');
      expect(response.status).toBe(404);
    });

    // Add test for successfully deleting an existing project
  });

  // Utility to add a project for testing GET/PUT/DELETE single project
  const addTestProject = async (name: string) => {
    const projectData = { name, description: `Desc for ${name}` };
    const res = await request(app).post('/api/projects').send(projectData);
    return res.body;
  };

  // Example of testing GET by ID after creating a project
  it('should get a project by its ID after creation', async () => {
    const createdProject = await addTestProject('Project For Get Test');
    const response = await request(app).get(`/api/projects/${createdProject.id}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(createdProject.id);
    expect(response.body.name).toBe('Project For Get Test');
  });
});
