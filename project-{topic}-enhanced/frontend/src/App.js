```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewPostPage from './pages/NewPostPage';
import EditPostPage from './pages/EditPostPage';
import PostDetailPage from './pages/PostDetailPage';
import PrivateRoute from './components/Auth/PrivateRoute';
import './App.css'; // Basic styling

function App() {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <main className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/posts/:identifier" element={<PostDetailPage />} />

            {/* Private Routes */}
            <Route element={<PrivateRoute allowedRoles={['admin', 'editor', 'author', 'subscriber']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<PrivateRoute allowedRoles={['admin', 'editor', 'author']} />}>
              <Route path="/posts/new" element={<NewPostPage />} />
              <Route path="/posts/:id/edit" element={<EditPostPage />} />
            </Route>
            {/* Admin-only routes can be added similarly */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
```