```typescript
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PostDetailPage from './pages/PostDetailPage';
import CreatePostPage from './pages/CreatePostPage';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { UserRole } from './types'; // Assuming types defined globally or imported

function App() {
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <Navbar />
      <main className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/posts/new"
            element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR]}>
                <CreatePostPage />
              </ProtectedRoute>
            }
          />
          {/* Add more routes for user management, category management etc. */}
          <Route path="*" element={<h1 className="text-xl text-center mt-10">404 - Not Found</h1>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
```