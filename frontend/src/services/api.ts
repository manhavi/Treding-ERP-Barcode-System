import axios from 'axios';

// API URL from root .env (VITE_API_URL) - same for web & mobile
const baseURL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors - don't auto-logout on 401 unless token is truly invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout if it's a 401 and we have a token (meaning token expired/invalid)
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      // Check if it's a token expiration error
      const errorMessage = error.response?.data?.error || '';
      if (errorMessage.includes('token') || errorMessage.includes('Invalid token')) {
        // Clear token and redirect to login only if token is actually invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Only redirect if we're not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
