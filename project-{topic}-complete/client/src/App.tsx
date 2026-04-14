import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import TaskPage from './pages/TaskPage';
import ProtectedRoute from './components/Common/ProtectedRoute';
import ProjectDetails from './components/Projects/ProjectDetails';
import TaskDetails from './components/Tasks/TaskDetails';
import Header from './components/Common/Header';
import Footer from './components/Common/Footer';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow p-4 container mx-auto">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TaskPage /></ProtectedRoute>} />
            <Route path="/tasks/:taskId" element={<ProtectedRoute><TaskDetails /></ProtectedRoute>} />
            {/* Add other protected routes as needed */}
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;