```typescript
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { UserRole } from '../../../backend/src/entities/Role'; // Direct import for Role enum

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    // Optionally render a loading spinner
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    // Not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as UserRole)) {
    // Authenticated but unauthorized, redirect to home or unauthorized page
    return <Navigate to="/" replace />; // Or /unauthorized
  }

  // Authenticated and authorized, render child routes
  return <Outlet />;
};

export default ProtectedRoute;
```