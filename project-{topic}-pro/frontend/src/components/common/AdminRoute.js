```javascript
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner'; // Assuming you have a loading spinner component

const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if the user has 'admin' role
  if (user.role !== 'admin') {
    // If not an admin, redirect to dashboard or an unauthorized page
    return <Navigate to="/dashboard" replace />; // Or /unauthorized
  }

  return children;
};

export default AdminRoute;
```