import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { CustomError } from '../utils/types'; // Assuming a types file

interface Dashboard {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const DashboardsContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const DashboardCard = styled(Link)`
  background-color: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: var(--primary-color);
  }

  p {
    font-size: 0.9rem;
    color: #666;
  }

  small {
    display: block;
    margin-top: 1rem;
    color: #999;
    font-size: 0.8rem;
  }
`;

const CreateButton = styled(Link)`
  background-color: var(--success-color);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.25rem;
  text-decoration: none;
  font-size: 1rem;
  &:hover {
    background-color: #218838;
  }
`;

const ErrorMessage = styled.p`
  color: var(--danger-color);
  text-align: center;
  margin-top: 2rem;
`;

const DashboardsPage: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // To potentially filter dashboards by user

  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboards');
        setDashboards(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch dashboards.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboards();
  }, []);

  if (loading) return <p>Loading dashboards...</p>;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;

  return (
    <DashboardsContainer>
      <Header>
        <h2>Your Dashboards</h2>
        <CreateButton to="/dashboards/new">Create New Dashboard</CreateButton>
      </Header>
      {dashboards.length === 0 ? (
        <p>No dashboards found. Start by creating one!</p>
      ) : (
        <DashboardGrid>
          {dashboards.map((dashboard) => (
            <DashboardCard key={dashboard.id} to={`/dashboards/${dashboard.id}`}>
              <h3>{dashboard.name}</h3>
              <p>{dashboard.description || 'No description provided.'}</p>
              <small>Created: {new Date(dashboard.createdAt).toLocaleDateString()}</small>
            </DashboardCard>
          ))}
        </DashboardGrid>
      )}
    </DashboardsContainer>
  );
};

export default DashboardsPage;