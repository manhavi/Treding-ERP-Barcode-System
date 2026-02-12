import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// API URL from mobile/src/config.ts - edit there to change server
const BASE_URL =
  API_URL && typeof API_URL === 'string' && API_URL.trim()
    ? API_URL.trim().endsWith('/api')
      ? API_URL.trim()
      : API_URL.trim().replace(/\/+$/, '') + '/api'
    : 'http://192.168.1.9:3001/api';

console.log('📡 API URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Request timeout:', error.config?.url);
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
      console.error('❌ Network error:', error.message);
      console.error('   Attempted URL:', error.config?.baseURL + error.config?.url);
    } else if (error.response) {
      console.error('❌ API error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Request error:', error.message);
    }

    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export function getBaseURL(): string {
  return api.defaults.baseURL || BASE_URL;
}

/** WebSocket server URL (same host as API, no /api path) */
export function getWebSocketURL(): string {
  const url = api.defaults.baseURL || BASE_URL;
  return url.replace(/\/api\/?$/, '') || url;
}

/** Test if server is reachable (for connection status) */
export const testConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.get('/health', { timeout: 10000 });
    if (response.data?.status === 'ok') {
      return { success: true, message: '✅ Server connected' };
    }
    return { success: false, message: '❌ Server response not OK' };
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      return { success: false, message: '❌ Timeout. Start backend and check .env API_URL.' };
    }
    if (error.code === 'ERR_NETWORK') {
      return { success: false, message: '❌ Cannot reach server. Check API_URL in .env and network.' };
    }
    return { success: false, message: `❌ ${error.message || 'Connection failed'}` };
  }
};

export default api;
