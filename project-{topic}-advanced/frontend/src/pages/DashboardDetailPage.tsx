import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import api from '../api/axiosConfig';
import { VisualizationType } from '../utils/types'; // Import enum
import BarChartComponent from '../components/charts/BarChartComponent';
// import LineChartComponent from '../components/charts/LineChartComponent';
// import PieChartComponent from '../components/charts/PieChartComponent';

interface Visualization {
  id: string;
  title: string;
  type: VisualizationType;
  description: string;
  config: any;
  query: any;
  dataSourceId: string | null;
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  visualizations: Visualization[];
  layout: any; // e.g., an array of grid items positions
}

const DashboardDetailContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  h2 {
    color: var(--dark-color);
    margin-bottom: 0.5rem;
  }
  p {
    color: #666;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
`;

const ChartCard = styled.div`
  background-color: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--primary-color);
  }
`;

const DashboardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vizData, setVizData] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/dashboards/${id}`);
        setDashboard(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [id]);

  useEffect(() => {
    const fetchVisualizationData = async (visualization: Visualization) => {
        if (!visualization.dataSourceId) return;
        try {
            const response = await api.post(`/data-sources/${visualization.dataSourceId}/data`, {
                query: visualization.query,
            });
            setVizData(prev => ({ ...prev, [visualization.id]: response.data }));
        } catch (err: any) {
            console.error(`Failed to fetch data for visualization ${visualization.id}:`, err);
            // setError could be set for individual viz if more granular error handling is needed
        }
    };

    if (dashboard && dashboard.visualizations.length > 0) {
      dashboard.visualizations.forEach(viz => {
        fetchVisualizationData(viz);
      });
    }
  }, [dashboard]);

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!dashboard) return <p>Dashboard not found.</p>;

  const renderVisualization = (viz: Visualization) => {
    const data = vizData[viz.id] || [];
    switch (viz.type) {
      case VisualizationType.BAR_CHART:
        return <BarChartComponent data={data} config={viz.config} title={viz.title} />;
      // case VisualizationType.LINE_CHART:
      //   return <LineChartComponent data={data} config={viz.config} title={viz.title} />;
      // case VisualizationType.PIE_CHART:
      //   return <PieChartComponent data={data} config={viz.config} title={viz.title} />;
      default:
        return <p>Unsupported visualization type: {viz.type}</p>;
    }
  };

  return (
    <DashboardDetailContainer>
      <Header>
        <div>
          <h2>{dashboard.name}</h2>
          <p>{dashboard.description}</p>
        </div>
        <Actions>
          <Link to={`/dashboards/${dashboard.id}/edit`} className="button primary">Edit Dashboard</Link>
          <Link to={`/dashboards/${dashboard.id}/add-viz`} className="button success">Add Visualization</Link>
        </Actions>
      </Header>
      <ChartGrid>
        {dashboard.visualizations.length === 0 ? (
          <p>No visualizations added to this dashboard yet. Add one!</p>
        ) : (
          dashboard.visualizations.map((viz) => (
            <ChartCard key={viz.id}>
              <h3>{viz.title}</h3>
              {renderVisualization(viz)}
            </ChartCard>
          ))
        )}
      </ChartGrid>
    </DashboardDetailContainer>
  );
};

export default DashboardDetailPage;