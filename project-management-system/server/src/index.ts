import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import projectRoutes from "./routes/projectRoutes";
import userRoutes from "./routes/userRoutes";
import fileRoutes from "./routes/fileRoutes";
import commentRoutes from "./routes/commentRoutes";
import searchRoutes from "./routes/searchRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import exportRoutes from "./routes/exportRoutes";
import timelineRoutes from "./routes/timelineRoutes";
import budgetRoutes from "./routes/budgetRoutes";
import resourceRoutes from "./routes/resourceRoutes";
import { initializeDatabase, testConnection } from "./config/database";

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get("/health", async (req: Request, res: Response) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbConnected ? "connected" : "disconnected"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Health check failed"
    });
  }
});

// Routes
app.use("/api/projects", projectRoutes);
app.use("/api/users", userRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/resources", resourceRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Project Management System API is running!");
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: "Something broke!",
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Initialize database and start server
const startServer = async () => {
  try {
    console.log("Initializing database...");
    await initializeDatabase();
    console.log("Database initialized successfully");

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      console.log(`Health check available at http://localhost:${port}/health`);
      console.log(`File uploads served from http://localhost:${port}/uploads`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
