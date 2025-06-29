import express, { Request, Response } from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get project budget overview
router.get('/projects/:projectId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const client = await pool.connect();

    // Get project budget details
    const projectResult = await client.query(
      'SELECT id, name, budget, actual_cost, budget_status FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get expenses by category
    const expensesByCategoryResult = await client.query(
      `SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
       FROM project_expenses
       WHERE project_id = $1
       GROUP BY category
       ORDER BY total_amount DESC`,
      [projectId]
    );

    // Get recent expenses
    const recentExpensesResult = await client.query(
      `SELECT 
        pe.*,
        u.name as submitted_by_name,
        au.name as approved_by_name
       FROM project_expenses pe
       LEFT JOIN users u ON pe.submitted_by = u.id
       LEFT JOIN users au ON pe.approved_by = au.id
       WHERE pe.project_id = $1
       ORDER BY pe.created_at DESC
       LIMIT 10`,
      [projectId]
    );

    // Get budget vs actual comparison
    const budgetComparisonResult = await client.query(
      `SELECT 
        SUM(CASE WHEN approved = true THEN amount ELSE 0 END) as approved_expenses,
        SUM(CASE WHEN approved = false THEN amount ELSE 0 END) as pending_expenses,
        COUNT(*) as total_expenses,
        COUNT(CASE WHEN approved = true THEN 1 END) as approved_count
       FROM project_expenses
       WHERE project_id = $1`,
      [projectId]
    );

    client.release();

    const project = projectResult.rows[0];
    const budgetComparison = budgetComparisonResult.rows[0];

    res.json({
      project: {
        ...project,
        remaining_budget: project.budget - project.actual_cost,
        budget_utilization: project.budget > 0 ? (project.actual_cost / project.budget) * 100 : 0
      },
      expensesByCategory: expensesByCategoryResult.rows,
      recentExpenses: recentExpensesResult.rows,
      budgetComparison
    });
  } catch (error) {
    console.error('Budget overview error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all expenses for a project
router.get('/projects/:projectId/expenses', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { category, status, dateFrom, dateTo } = req.query;
    const client = await pool.connect();

    let query = `
      SELECT 
        pe.*,
        u.name as submitted_by_name,
        au.name as approved_by_name
      FROM project_expenses pe
      LEFT JOIN users u ON pe.submitted_by = u.id
      LEFT JOIN users au ON pe.approved_by = au.id
      WHERE pe.project_id = $1
    `;
    const params: any[] = [projectId];
    let paramIndex = 2;

    if (category) {
      query += ` AND pe.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status === 'approved') {
      query += ` AND pe.approved = true`;
    } else if (status === 'pending') {
      query += ` AND pe.approved = false`;
    }

    if (dateFrom) {
      query += ` AND pe.expense_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND pe.expense_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    query += ` ORDER BY pe.created_at DESC`;

    const result = await client.query(query, params);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new expense
router.post('/expenses', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const {
      project_id,
      description,
      amount,
      category,
      expense_date,
      notes,
      receipt_url
    } = req.body;

    const client = await pool.connect();

    const result = await client.query(
      `INSERT INTO project_expenses (
        project_id, description, amount, category, expense_date,
        notes, receipt_url, submitted_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [project_id, description, amount, category, expense_date, notes, receipt_url, req.user.id]
    );

    // Update project actual cost
    await client.query(
      'UPDATE projects SET actual_cost = actual_cost + $1 WHERE id = $2',
      [amount, project_id]
    );

    // Update budget status
    await client.query(
      `UPDATE projects 
       SET budget_status = CASE 
         WHEN actual_cost > budget THEN 'Over Budget'
         WHEN actual_cost = budget THEN 'On Budget'
         ELSE 'Under Budget'
       END
       WHERE id = $1`,
      [project_id]
    );

    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update expense
router.put('/expenses/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      description,
      amount,
      category,
      expense_date,
      notes,
      receipt_url
    } = req.body;

    const client = await pool.connect();

    // Get current expense amount
    const currentExpenseResult = await client.query(
      'SELECT amount, project_id FROM project_expenses WHERE id = $1',
      [id]
    );

    if (currentExpenseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const currentExpense = currentExpenseResult.rows[0];
    const amountDifference = amount - currentExpense.amount;

    // Update expense
    const result = await client.query(
      `UPDATE project_expenses 
       SET description = $1, amount = $2, category = $3, expense_date = $4,
           notes = $5, receipt_url = $6
       WHERE id = $7
       RETURNING *`,
      [description, amount, category, expense_date, notes, receipt_url, id]
    );

    // Update project actual cost
    await client.query(
      'UPDATE projects SET actual_cost = actual_cost + $1 WHERE id = $2',
      [amountDifference, currentExpense.project_id]
    );

    // Update budget status
    await client.query(
      `UPDATE projects 
       SET budget_status = CASE 
         WHEN actual_cost > budget THEN 'Over Budget'
         WHEN actual_cost = budget THEN 'On Budget'
         ELSE 'Under Budget'
       END
       WHERE id = $1`,
      [currentExpense.project_id]
    );

    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Approve/reject expense
router.patch('/expenses/:id/approve', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    const { approved } = req.body;

    const client = await pool.connect();

    const result = await client.query(
      `UPDATE project_expenses 
       SET approved = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [approved, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    client.release();
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete expense
router.delete('/expenses/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();

    // Get expense details
    const expenseResult = await client.query(
      'SELECT amount, project_id FROM project_expenses WHERE id = $1',
      [id]
    );

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const expense = expenseResult.rows[0];

    // Delete expense
    await client.query('DELETE FROM project_expenses WHERE id = $1', [id]);

    // Update project actual cost
    await client.query(
      'UPDATE projects SET actual_cost = actual_cost - $1 WHERE id = $2',
      [expense.amount, expense.project_id]
    );

    // Update budget status
    await client.query(
      `UPDATE projects 
       SET budget_status = CASE 
         WHEN actual_cost > budget THEN 'Over Budget'
         WHEN actual_cost = budget THEN 'On Budget'
         ELSE 'Under Budget'
       END
       WHERE id = $1`,
      [expense.project_id]
    );

    client.release();
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get expense categories
router.get('/categories', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM expense_categories ORDER BY name');
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create expense category
router.post('/categories', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, description, color } = req.body;
    const client = await pool.connect();

    const result = await client.query(
      'INSERT INTO expense_categories (name, description, color) VALUES ($1, $2, $3) RETURNING *',
      [name, description, color || '#1976d2']
    );

    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get budget analytics
router.get('/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();

    // Overall budget statistics
    const overallStatsResult = await client.query(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(budget) as total_budget,
        SUM(actual_cost) as total_actual_cost,
        AVG(budget) as avg_budget,
        AVG(actual_cost) as avg_actual_cost
      FROM projects
      WHERE budget > 0
    `);

    // Projects by budget status
    const budgetStatusResult = await client.query(`
      SELECT 
        budget_status,
        COUNT(*) as count,
        SUM(budget) as total_budget,
        SUM(actual_cost) as total_actual_cost
      FROM projects
      WHERE budget > 0
      GROUP BY budget_status
    `);

    // Monthly expense trends
    const monthlyTrendsResult = await client.query(`
      SELECT 
        DATE_TRUNC('month', expense_date) as month,
        COUNT(*) as expense_count,
        SUM(amount) as total_amount
      FROM project_expenses
      WHERE expense_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', expense_date)
      ORDER BY month DESC
    `);

    // Top expense categories
    const topCategoriesResult = await client.query(`
      SELECT 
        category,
        COUNT(*) as expense_count,
        SUM(amount) as total_amount
      FROM project_expenses
      GROUP BY category
      ORDER BY total_amount DESC
      LIMIT 10
    `);

    client.release();

    res.json({
      overallStats: overallStatsResult.rows[0],
      budgetStatus: budgetStatusResult.rows,
      monthlyTrends: monthlyTrendsResult.rows,
      topCategories: topCategoriesResult.rows
    });
  } catch (error) {
    console.error('Budget analytics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 