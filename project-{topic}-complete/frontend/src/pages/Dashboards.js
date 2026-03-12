import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { Link } from 'react-router-dom';
import DashboardCard from '../components/Dashboard/DashboardCard'; // Reusable component

function Dashboards() {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboards();
  }, []);

  const fetchDashboards = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/dashboards');
      setDashboards(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboards.');
      console.error('Error fetching dashboards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDashboard = async (id) => {
    if (window.confirm('Are you sure you want to delete this dashboard?')) {
      try {
        await api.delete(`/dashboards/${id}`);
        setDashboards(dashboards.filter((dashboard) => dashboard.id !== id));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete dashboard.');
        console.error('Error deleting dashboard:', err);
      }
    }
  };

  if (loading) return <div className="loading">Loading dashboards...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Your Dashboards</h1>
        <Link to="/dashboards/new" className="btn btn-primary">
          Create New Dashboard
        </Link>
      </div>

      {dashboards.length === 0 ? (
        <p className="no-data-message">No dashboards created yet. Start by creating one!</p>
      ) : (
        <div className="dashboard-grid">
          {dashboards.map((dashboard) => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              onDelete={handleDeleteDashboard}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboards;