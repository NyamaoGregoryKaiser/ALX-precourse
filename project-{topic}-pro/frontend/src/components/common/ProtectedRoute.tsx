```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Optionally, you could add role-based protection
  // requiredRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redirect to the login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  // TODO: Add role-based access control here if `requiredRoles` were passed
  // if (requiredRoles && user && !requiredRoles.some(role => user.roles.includes(role))) {
  //   return <Navigate to="/unauthorized" replace />; // Or show an error message
  // }

  return <>{children}</>;
};

export default ProtectedRoute;
```