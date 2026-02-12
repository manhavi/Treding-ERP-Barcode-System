import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface Permissions {
  purchase: boolean;
  inventory: boolean;
  dispatch: boolean;
  billing: boolean;
  parties: boolean;
  staff: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  role?: 'admin' | 'staff';
  company?: 'aaradhya_fashion' | 'af_creation' | null; // null means both companies access
  hasBothCompanies?: boolean; // true if staff has same PIN for both companies
  permissions?: Permissions;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (permission: keyof Permissions) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (code: string) => {
    try {
      const response = await api.post('/auth/login', { code });
      const { token: newToken, user: newUser } = response.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: any) {
      // Re-throw with better error message
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Connection timeout. Backend server is not responding.');
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        throw new Error('Network error. Cannot reach backend server.');
      } else if (!error.response) {
        throw new Error('Cannot connect to backend server. Please check if backend is running.');
      } else {
        throw error; // Re-throw original error with response data
      }
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAdmin = user?.role === 'admin';
  
  const hasPermission = (permission: keyof Permissions): boolean => {
    if (isAdmin) return true; // Admin has all permissions
    return user?.permissions?.[permission] ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isAdmin,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
