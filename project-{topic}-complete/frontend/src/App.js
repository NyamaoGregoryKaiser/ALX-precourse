import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Common/Header';
import PrivateRoute from './components/Common/PrivateRoute';
import Home from './pages/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboards from './pages/Dashboards';
import DataSources from './pages/DataSources';
import Visualize from './pages/Visualize';
import NotFound from './pages/NotFound';
import DashboardEditor from './components/Dashboard/DashboardEditor';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-container">
      <Header />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
            <Route path="/dashboards" element={<Dashboards />} />
            <Route path="/dashboards/new" element={<DashboardEditor />} />
            <Route path="/dashboards/edit/:id" element={<DashboardEditor />} />
            <Route path="/data-sources" element={<DataSources />} />
            <Route path="/visualize" element={<Visualize />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;