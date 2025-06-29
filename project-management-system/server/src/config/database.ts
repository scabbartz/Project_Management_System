import { Pool, PoolConfig } from 'pg';

// Database configuration
const dbConfig: PoolConfig = {
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pms_dev_db',
  password: process.env.DB_PASSWORD || 'secret',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create a new pool instance
const pool = new Pool(dbConfig);

// Test the database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Function to test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

// Function to initialize database tables
export const initializeDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Team Member',
        avatar VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);

    // Create projects table with budget fields
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        scope TEXT,
        status VARCHAR(50) DEFAULT 'Planning',
        priority VARCHAR(50) DEFAULT 'Medium',
        tags TEXT[],
        start_date DATE,
        end_date DATE,
        actual_start_date DATE,
        actual_end_date DATE,
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        budget DECIMAL(15,2) DEFAULT 0,
        actual_cost DECIMAL(15,2) DEFAULT 0,
        budget_status VARCHAR(50) DEFAULT 'On Budget',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create project expenses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_expenses (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        description VARCHAR(500) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        expense_date DATE NOT NULL,
        approved BOOLEAN DEFAULT FALSE,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        submitted_by INTEGER REFERENCES users(id),
        receipt_url VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create expense categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#1976d2',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create project milestones table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_milestones (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE NOT NULL,
        completed_date DATE,
        status VARCHAR(50) DEFAULT 'Pending',
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create project tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        milestone_id INTEGER REFERENCES project_milestones(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'To Do',
        priority VARCHAR(50) DEFAULT 'Medium',
        assigned_to INTEGER REFERENCES users(id),
        due_date DATE,
        completed_date DATE,
        estimated_hours DECIMAL(5,2),
        actual_hours DECIMAL(5,2),
        estimated_cost DECIMAL(10,2),
        actual_cost DECIMAL(10,2),
        order_index INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task dependencies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
        depends_on_task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
        dependency_type VARCHAR(50) DEFAULT 'Finish-to-Start',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, depends_on_task_id)
      )
    `);

    // Create project attachments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_attachments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        type VARCHAR(100),
        size INTEGER,
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create project comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_comments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create timeline events table for activity tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS timeline_events (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
        milestone_id INTEGER REFERENCES project_milestones(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create resource allocations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS resource_allocations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        role VARCHAR(100) NOT NULL,
        allocation_percentage INTEGER NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
      CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_projects_budget ON projects(budget, actual_cost);
      CREATE INDEX IF NOT EXISTS idx_expenses_project ON project_expenses(project_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON project_expenses(category);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON project_expenses(expense_date);
      CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id);
      CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON project_milestones(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_project ON project_tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON project_tasks(milestone_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON project_tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON project_tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_timeline_events_project ON timeline_events(project_id);
      CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_resource_allocations_project ON resource_allocations(project_id);
      CREATE INDEX IF NOT EXISTS idx_resource_allocations_user ON resource_allocations(user_id);
      CREATE INDEX IF NOT EXISTS idx_resource_allocations_dates ON resource_allocations(start_date, end_date);
    `);

    // Insert default expense categories
    await client.query(`
      INSERT INTO expense_categories (name, description, color) VALUES
      ('Equipment', 'Hardware, software, and tools', '#1976d2'),
      ('Travel', 'Transportation and accommodation', '#388e3c'),
      ('Materials', 'Raw materials and supplies', '#f57c00'),
      ('Services', 'External services and consulting', '#7b1fa2'),
      ('Marketing', 'Advertising and promotional expenses', '#d32f2f'),
      ('Training', 'Employee training and development', '#1976d2'),
      ('Utilities', 'Electricity, internet, and other utilities', '#388e3c'),
      ('Other', 'Miscellaneous expenses', '#757575')
      ON CONFLICT (name) DO NOTHING
    `);

    // Insert default admin user if not exists
    const adminCheck = await client.query('SELECT id FROM users WHERE email = $1', ['admin@khelotech.com']);
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Admin User', 'admin@khelotech.com', hashedPassword, 'Admin']
      );
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export default pool; 