```typescript jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import PostsPage from './pages/PostsPage';
import UsersPage from './pages/UsersPage';
import { useAuthStore } from './store/authStore';
import AuthGuard from './components/AuthGuard';

function App() {
  const { user } = useAuthStore(); // Access user state globally

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<AuthGuard children={<DashboardLayout />} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<div>Welcome to Dashboard!</div>} /> {/* Simple welcome for now */}
          <Route path="posts" element={<PostsPage />} />
          <Route path="posts/new" element={<PostsPage isCreating={true} />} /> {/* For creating new post */}
          <Route path="posts/edit/:id" element={<PostsPage isEditing={true} />} /> {/* For editing existing post */}
          <Route path="users" element={<UsersPage />} />
          {/* Add more protected routes here */}
        </Route>

        {/* Catch-all for unknown routes */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </div>
  );
}

export default App;
```