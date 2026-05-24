```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute'; // For role-based access
import './index.css'; // For Tailwind CSS

const Navbar = () => {
  const { isAuthenticated, currentUser, logout, loading } = useAuth();

  if (loading) return null; // Or a simple loading indicator

  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">CMS Project</Link>
        <div>
          <Link to="/" className="mr-4 hover:text-gray-300">Home</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="mr-4 hover:text-gray-300">Dashboard</Link>
              <span className="mr-4">Welcome, {currentUser?.username}!</span>
              <button onClick={logout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mr-4 hover:text-gray-300">Login</Link>
              <Link to="/register" className="hover:text-gray-300">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<div className="container mx-auto p-4 text-red-600">You are not authorized to view this page.</div>} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'editor', 'viewer']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Add more protected routes here */}
            {/* <Route path="/posts/:id" element={<PostDetailPage />} /> */}
          </Route>

          {/* Admin/Editor specific routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'editor']} />}>
            {/* Placeholder for content management */}
            <Route path="/posts/new" element={<div>Create New Post (Editor/Admin Only)</div>} />
            <Route path="/posts/manage" element={<div>Manage My Posts (Editor/Admin Only)</div>} />
            <Route path="/categories/manage" element={<div>Manage Categories (Editor/Admin Only)</div>} />
          </Route>

          {/* Admin specific routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            {/* Placeholder for user management */}
            <Route path="/users/new" element={<div>Create New User (Admin Only)</div>} />
            <Route path="/users/manage" element={<div>Manage All Users (Admin Only)</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
```