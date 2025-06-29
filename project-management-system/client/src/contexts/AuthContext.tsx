import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("AuthContext - Initial token from localStorage:", token);

  // Check if user is authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      console.log("AuthContext - Checking authentication with token:", token);
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log("AuthContext - Profile check response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log("AuthContext - Profile check successful, user:", data.user);
            setUser(data.user);
          } else {
            // Token is invalid, clear it
            console.log("AuthContext - Token invalid, clearing");
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (err) {
          console.error('AuthContext - Auth check failed:', err);
          localStorage.removeItem('token');
          setToken(null);
        }
      } else {
        console.log("AuthContext - No token found");
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      console.log("AuthContext - Attempting login for:", email);

      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("AuthContext - Login response status:", response.status);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      console.log("AuthContext - Login successful, setting token and user");
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: string = 'Team Member') => {
    try {
      setError(null);
      setLoading(true);
      console.log("AuthContext - Attempting registration for:", email);

      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();
      console.log("AuthContext - Registration response status:", response.status);

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      console.log("AuthContext - Registration successful, setting token and user");
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log("AuthContext - Logging out, clearing token and user");
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const clearError = () => {
    setError(null);
  };

  console.log("AuthContext - Current state - user:", user, "token:", token ? "present" : "missing", "loading:", loading);

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 