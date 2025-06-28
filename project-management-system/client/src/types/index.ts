// Corresponds to the backend Project interface in projectRoutes.ts
export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: string; // Dates will be strings from JSON
  endDate?: string;   // Dates will be strings from JSON
  scope?: string;
  objectives?: string[];
  deliverables?: string[];
  // status?: string; // Will add later
  // created_by_user_id?: string; // Will add later
  // created_at?: string; // Will add later
  // updated_at?: string; // Will add later
}

// Example User type, can be expanded
export interface User {
  id: string;
  name: string;
  email?: string;
}
