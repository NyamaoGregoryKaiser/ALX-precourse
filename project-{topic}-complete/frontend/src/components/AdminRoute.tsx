import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../utils/types';

const AdminRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center p-4">Loading authentication...</div>;
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is logged in but not an admin, redirect to dashboard or home
  if (user.role !== Role.Admin) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is an admin, render the child routes
  return <Outlet />;
};

export default AdminRoute;