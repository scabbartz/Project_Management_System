// Project status enum for future implementation
export enum ProjectStatus {
  PLANNING = 'Planning',
  ACTIVE = 'Active',
  ON_HOLD = 'On Hold',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

// Corresponds to the backend Project interface in projectRoutes.ts
export interface Project {
  id: number;
  name: string;
  description: string;
  scope: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  tags: string[];
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  progress: number; // 0-100
  budget: number;
  actual_cost: number;
  budget_status: 'Under Budget' | 'On Budget' | 'Over Budget';
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  milestones?: Milestone[];
  tasks?: Task[];
  created_by_user?: User;
}

// Planned interfaces for future features
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Team Member';
  avatar?: string;
  created_at: string;
  last_login?: string;
}

export interface Milestone {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  due_date: string;
  completed_date?: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  order_index: number;
  created_at: string;
  tasks?: Task[];
}

export interface Task {
  id: number;
  project_id: number;
  milestone_id?: number;
  name: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assigned_to?: number;
  assigned_to_name?: string;
  due_date?: string;
  completed_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  estimated_cost?: number;
  actual_cost?: number;
  order_index: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  dependencies?: TaskDependency[];
  comments?: Comment[];
  assigned_user?: User;
  created_by_user?: User;
  milestone?: Milestone;
}

export interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  dependency_type: 'Finish-to-Start' | 'Start-to-Start' | 'Finish-to-Finish' | 'Start-to-Finish';
  created_at: string;
  depends_on_task?: Task;
}

export interface ProjectAttachment {
  id: number;
  project_id: number;
  name: string;
  url: string;
  type?: string;
  size?: number;
  uploaded_by: number;
  uploaded_at: string;
  uploaded_by_user?: User;
}

export interface Comment {
  id: number;
  project_id: number;
  task_id?: number;
  author_id: number;
  content: string;
  created_at: string;
  author?: User;
}

export interface TimelineEvent {
  id: number;
  project_id: number;
  task_id?: number;
  milestone_id?: number;
  event_type: string;
  event_data?: any;
  user_id?: number;
  created_at: string;
  user?: User;
  task?: Task;
  milestone?: Milestone;
}

export interface ProjectFormData {
  name: string;
  description: string;
  scope: string;
  status: string;
  priority: string;
  tags: string[];
  start_date: string;
  end_date: string;
  budget: number;
}

export interface MilestoneFormData {
  name: string;
  description: string;
  due_date: string;
  order_index: number;
}

export interface TaskFormData {
  name: string;
  description: string;
  status: string;
  priority: string;
  assigned_to?: number;
  due_date: string;
  estimated_hours: number;
  estimated_cost: number;
  milestone_id?: number;
  order_index?: number;
}

export interface SearchFilters {
  status?: string;
  priority?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  assignedTo?: number;
  budgetRange?: {
    min: number;
    max: number;
  };
}

export interface SearchResult {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueProjects: number;
  totalBudget: number;
  totalSpent: number;
  upcomingDeadlines: Array<{
    id: number;
    name: string;
    due_date: string;
    type: 'task' | 'milestone';
  }>;
  recentActivity: TimelineEvent[];
}

export interface ProjectStats {
  totalProjects: number;
  recentProjects: number;
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

export interface TimelineStats {
  upcomingDeadlines: Array<{
    id: number;
    name: string;
    type: 'milestone' | 'task';
    due_date: string;
    project_name: string;
  }>;
  overdueItems: Array<{
    id: number;
    name: string;
    type: 'milestone' | 'task';
    due_date: string;
    project_name: string;
    days_overdue: number;
  }>;
  recentProgress: Array<{
    project_id: number;
    project_name: string;
    progress: number;
    updated_at: string;
  }>;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Budget and Expense types
export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface ProjectExpense {
  id: number;
  project_id: number;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  approved: boolean;
  approved_by?: number;
  approved_at?: string;
  submitted_by: number;
  receipt_url?: string;
  notes?: string;
  created_at: string;
  submitted_by_name?: string;
  approved_by_name?: string;
}

export interface BudgetOverview {
  project: {
    id: number;
    name: string;
    budget: number;
    actual_cost: number;
    budget_status: string;
    remaining_budget: number;
    budget_utilization: number;
  };
  expensesByCategory: Array<{
    category: string;
    count: number;
    total_amount: number;
    avg_amount: number;
  }>;
  recentExpenses: ProjectExpense[];
  budgetComparison: {
    approved_expenses: number;
    pending_expenses: number;
    total_expenses: number;
    approved_count: number;
  };
}

export interface BudgetAnalytics {
  overallStats: {
    total_projects: number;
    total_budget: number;
    total_actual_cost: number;
    avg_budget: number;
    avg_actual_cost: number;
  };
  budgetStatus: Array<{
    budget_status: string;
    count: number;
    total_budget: number;
    total_actual_cost: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    expense_count: number;
    total_amount: number;
  }>;
  topCategories: Array<{
    category: string;
    expense_count: number;
    total_amount: number;
  }>;
}

// Analytics types
export interface ProjectAnalytics {
  totalProjects: number;
  projectsByStatus: Array<{
    status: string;
    count: number;
  }>;
  projectsByPriority: Array<{
    priority: string;
    count: number;
  }>;
  recentActivity: Array<{
    type: string;
    project: Project;
    timestamp: string;
  }>;
  progressOverview: {
    averageProgress: number;
    completedProjects: number;
    overdueProjects: number;
  };
}

// Export types
export interface ExportOptions {
  format: 'pdf' | 'csv';
  includeTasks?: boolean;
  includeComments?: boolean;
  includeAttachments?: boolean;
  includeTimeline?: boolean;
  includeBudget?: boolean;
}

export interface ExpenseFormData {
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  notes: string;
  receipt_url?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
