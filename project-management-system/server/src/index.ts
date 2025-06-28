import express, { Request, Response, NextFunction } from "express";
import projectRoutes from "./routes/projectRoutes";

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Routes
app.use("/api", projectRoutes); // Prefixing all project routes with /api

app.get("/", (req: Request, res: Response) => {
  res.send("Project Management System API is running!");
});

// Basic error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
