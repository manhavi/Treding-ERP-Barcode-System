import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PurchasePage from './pages/PurchasePage';
import InventoryPage from './pages/InventoryPage';
import DispatchPage from './pages/DispatchPage';
import BillingPage from './pages/BillingPage';
import StaffPage from './pages/StaffPage';
import PartyListPage from './pages/PartyListPage';
import BackupPage from './pages/BackupPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { initOfflineDB } from './services/offline';
import { syncOfflineData } from './services/sync';
import { connectWebSocket, disconnectWebSocket } from './services/websocket';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Get the first allowed page for the user
function getFirstAllowedPage(hasPermission: (permission: keyof { purchase: boolean; inventory: boolean; dispatch: boolean; billing: boolean; parties: boolean; staff: boolean }) => boolean, isAdmin: boolean): string {
  if (isAdmin) return '/purchase'; // Admin can access all, default to purchase
  
  // Check permissions in order
  if (hasPermission('purchase')) return '/purchase';
  if (hasPermission('inventory')) return '/inventory';
  if (hasPermission('dispatch')) return '/dispatch';
  if (hasPermission('billing')) return '/billing';
  if (hasPermission('parties')) return '/parties';
  if (hasPermission('staff')) return '/staff';
  
  return '/billing'; // Fallback
}

function DefaultRedirect() {
  const { hasPermission, isAdmin } = useAuth();
  const firstPage = getFirstAllowedPage(hasPermission, isAdmin);
  return <Navigate to={firstPage} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DefaultRedirect />} />
        <Route path="purchase" element={<ProtectedRoute requiredPermission="purchase"><PurchasePage /></ProtectedRoute>} />
        <Route path="inventory" element={<ProtectedRoute requiredPermission="inventory"><InventoryPage /></ProtectedRoute>} />
        <Route path="dispatch" element={<ProtectedRoute requiredPermission="dispatch"><DispatchPage /></ProtectedRoute>} />
        <Route path="billing" element={<ProtectedRoute requiredPermission="billing"><BillingPage /></ProtectedRoute>} />
        <Route path="parties" element={<ProtectedRoute requiredPermission="parties"><PartyListPage /></ProtectedRoute>} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="staff" element={<ProtectedRoute requiredPermission="staff"><StaffPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Initialize offline database
    initOfflineDB();
    // Sync offline data when online
    if (navigator.onLine) {
      syncOfflineData();
    }
    
    // Connect WebSocket for real-time updates
    // Add small delay to ensure backend is ready
    const connectTimer = setTimeout(() => {
      connectWebSocket();
    }, 500);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(connectTimer);
      setTimeout(() => disconnectWebSocket(), 100);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
