import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: 'purchase' | 'inventory' | 'dispatch' | 'billing' | 'parties' | 'staff';
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

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Redirect to first allowed page instead of just "/"
    const firstPage = getFirstAllowedPage(hasPermission, isAdmin);
    return <Navigate to={firstPage} replace />;
  }

  return <>{children}</>;
}
