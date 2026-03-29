import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Loader from './Loader';
import { hasPermission } from '@/utils/authHelpers'; // Assuming a helper for client-side permission check
import { toast } from 'react-toastify';

interface ProtectedRouteProps {
  requiredPermissions?: string[];
  requiredRoles?: string[]; // Although we prefer permissions, roles can be a quick check
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermissions = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    toast.error('You need to log in to access this page.');
    return <Navigate to="/login" replace />;
  }

  // Check permissions
  if (requiredPermissions.length > 0 && !hasPermission(user, requiredPermissions)) {
    toast.error('You do not have permission to view this page.');
    return <Navigate to="/dashboard" replace />; // Redirect to a generic authenticated page
  }

  return <Outlet />;
};

export default ProtectedRoute;