import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  console.log('=== AUTHENTICATION DEBUG ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('All headers:', req.headers);
  
  const authHeader = req.headers['authorization'];
  console.log('Authorization header:', authHeader);
  
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  console.log('Extracted token:', token ? 'present' : 'missing');

  if (!token) {
    console.log('No token found, returning 401');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    console.log('JWT_SECRET:', JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('Token decoded successfully:', decoded);
    
    // Verify user still exists in database
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [decoded.userId]
    );
    client.release();

    console.log('Database query result:', result.rows);

    if (result.rows.length === 0) {
      console.log('User not found in database');
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = result.rows[0];
    console.log('User set in request:', req.user);
    console.log('=== AUTHENTICATION SUCCESS ===');
    next();
  } catch (error) {
    console.log('Token verification failed:', error);
    console.log('=== AUTHENTICATION FAILED ===');
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user has required role
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

// Generate JWT token
export const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcryptjs');
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

// Compare password
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}; 