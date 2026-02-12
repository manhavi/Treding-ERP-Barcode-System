import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { connectWebSocket, disconnectWebSocket } from '../services/websocket';

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
  company?: 'aaradhya_fashion' | 'af_creation' | null;
  hasBothCompanies?: boolean;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Connect WebSocket if user is already logged in
  useEffect(() => {
    if (token) {
      connectWebSocket();
    }
    
    return () => {
      if (!token) {
        disconnectWebSocket();
      }
    };
  }, [token]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (code: string) => {
    try {
      console.log('🔑 Attempting login with code:', code);
      const response = await api.post('/auth/login', { code });
      
      console.log('✅ Login successful:', response.data);
      
      const { token: newToken, user: newUser } = response.data;
      setToken(newToken);
      setUser(newUser);
      await AsyncStorage.setItem('token', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      
      // Connect WebSocket after successful login
      connectWebSocket();
    } catch (error: any) {
      console.error('❌ Login error details:');
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      console.error('   Response status:', error.response?.status);
      console.error('   Response data:', error.response?.data);
      console.error('   Request URL:', error.config?.baseURL + error.config?.url);
      
      // Provide better error messages
      if (error.code === 'ECONNABORTED') {
        error.message = 'Connection timeout. Server is not responding.';
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        error.message = 'Network error. Cannot reach server.';
      } else if (!error.response) {
        error.message = 'Cannot connect to server. Check IP address and network.';
      }
      
      throw error;
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    // Disconnect WebSocket on logout
    disconnectWebSocket();
  };

  const isAdmin = user?.role === 'admin';
  
  const hasPermission = (permission: keyof Permissions): boolean => {
    if (isAdmin) return true;
    return user?.permissions?.[permission] ?? false;
  };

  if (loading) {
    return null; // Or a loading screen
  }

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
