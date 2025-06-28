import express from "express";

const router = express.Router();

// Define a basic Project type/interface (will be expanded later)
// This will eventually move to a dedicated types/interfaces directory
export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  scope?: string; // Detailed description of what the project includes and excludes
  objectives?: string[]; // Specific goals the project aims to achieve
  deliverables?: string[]; // Tangible outputs of the project
}

// In-memory store for projects (replace with DB later)
let projectsDB: Project[] = [];

// GET / - Get all projects (relative to the mount point /api/projects)
router.get("/", (req, res) => {
  res.json(projectsDB);
});

// POST / - Create a new project (relative to the mount point /api/projects)
router.post("/", (req, res) => {
  const { name, description, startDate, endDate, scope, objectives, deliverables } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Project name is required" });
  }
  const newProject: Project = {
    id: String(Date.now() + Math.random().toString(36).substring(2, 9)), // Simple unique ID
    name,
    description,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    scope,
    objectives,
    deliverables,
  };
  projectsDB.push(newProject);
  res.status(201).json(newProject);
});

// GET /:id - Get a single project by ID (relative to the mount point /api/projects)
router.get("/:id", (req, res) => {
  const project = projectsDB.find(p => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  res.json(project);
});

// PUT /:id - Update a project (relative to the mount point /api/projects)
router.put("/:id", (req, res) => {
  const projectId = req.params.id;
  const projectIndex = projectsDB.findIndex(p => p.id === projectId);
  if (projectIndex === -1) {
    return res.status(404).json({ message: "Project not found" });
  }
  const existingProject = projectsDB[projectIndex];
  const { name, description, startDate, endDate, scope, objectives, deliverables } = req.body;

  // Only update fields that are provided in the request body
  const updatedProject: Project = {
    ...existingProject,
    name: name !== undefined ? name : existingProject.name,
    description: description !== undefined ? description : existingProject.description,
    startDate: startDate ? new Date(startDate) : existingProject.startDate,
    endDate: endDate ? new Date(endDate) : existingProject.endDate,
    scope: scope !== undefined ? scope : existingProject.scope,
    objectives: objectives !== undefined ? objectives : existingProject.objectives,
    deliverables: deliverables !== undefined ? deliverables : existingProject.deliverables,
  };

  // Ensure name is not removed if it was the only field not updated or if not provided initially
  if (updatedProject.name === undefined || updatedProject.name === "") {
     return res.status(400).json({ message: "Project name is required and cannot be empty for an update." });
  }

  projectsDB[projectIndex] = updatedProject;
  res.json(updatedProject);
});

// DELETE /:id - Delete a project (relative to the mount point /api/projects)
router.delete("/:id", (req, res) => {
  const projectId = req.params.id;
  const initialLength = projectsDB.length;
  projectsDB = projectsDB.filter(p => p.id !== projectId);
  if (projectsDB.length === initialLength) {
    return res.status(404).json({ message: "Project not found" });
  }
  res.status(204).send(); // No content
});

export default router;
