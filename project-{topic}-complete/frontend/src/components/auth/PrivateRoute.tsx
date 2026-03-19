```typescript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PrivateRouteProps } from '../../types';
import { toast } from 'react-toastify';

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Optionally render a loading spinner or placeholder
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    toast.warn('You need to log in to access this page.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    toast.error('You do not have the necessary permissions to view this page.');
    return <Navigate to="/" replace />; // Redirect to home or an unauthorized page
  }

  return <>{children}</>;
};

export default PrivateRoute;
```