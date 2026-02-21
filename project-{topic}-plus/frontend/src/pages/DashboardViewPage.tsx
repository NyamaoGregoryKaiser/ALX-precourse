```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Grid, Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Dashboard, Chart, ChartType, DataSource } from '../types';
import axiosInstance from '../api/axios';
import { useNotification } from '../contexts/NotificationContext';
import ChartRenderer from '../components/charts/ChartRenderer';

const DashboardViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const [chartsData, setChartsData] = useState<{ [key: string]: any[] }>({});
  const [chartDataLoading, setChartDataLoading] = useState<{ [key: string]: boolean }>({});

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/dashboards/${id}`);
      setDashboard(response.data.data);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to fetch dashboard', 'error');
      navigate('/dashboards'); // Redirect if dashboard not found or inaccessible
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showNotification]);

  const fetchChartData = useCallback(async (chart: Chart) => {
    setChartDataLoading(prev => ({ ...prev, [chart.id]: true }));
    try {
      const response = await axiosInstance.get(`/charts/${chart.id}/data`);
      setChartsData(prev => ({ ...prev, [chart.id]: response.data.data }));
    } catch (error: any) {
      showNotification(`Failed to load data for chart "${chart.name}": ${error.response?.data?.message || error.message}`, 'error');
      setChartsData(prev => ({ ...prev, [chart.id]: [] })); // Set empty data on error
    } finally {
      setChartDataLoading(prev => ({ ...prev, [chart.id]: false }));
    }
  }, [showNotification]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (dashboard?.charts && dashboard.charts.length > 0) {
      dashboard.charts.forEach(chart => fetchChartData(chart));
    }
  }, [dashboard, fetchChartData]);

  const handleDeleteChart = async (chartId: string) => {
    if (!window.confirm('Are you sure you want to delete this chart?')) return;
    try {
      await axiosInstance.delete(`/charts/${chartId}`);
      showNotification('Chart deleted successfully!', 'success');
      fetchDashboard(); // Re-fetch dashboard to update chart list
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to delete chart', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard) {
    return <Typography>Dashboard not found.</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          {dashboard.name}
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={Link}
            to={`/charts/new?dashboardId=${dashboard.id}`}
            sx={{ mr: 2 }}
          >
            Add Chart
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            component={Link}
            to={`/dashboards`} // Back to list for now
          >
            Back to Dashboards
          </Button>
        </Box>
      </Box>
      <Typography variant="body1" color="textSecondary" mb={4}>
        {dashboard.description || 'No description provided.'}
      </Typography>

      <Grid container spacing={4}>
        {dashboard.charts && dashboard.charts.length > 0 ? (
          dashboard.charts.map((chart) => (
            <Grid item xs={12} md={6} lg={4} key={chart.id}>
              <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, height: '400px', display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                    {chart.name} ({chart.type})
                  </Typography>
                  <Box>
                    <IconButton component={Link} to={`/charts/edit/${chart.id}`} color="info" size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteChart(chart.id)} color="error" size="small">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Data Source: {chart.dataSource?.name || 'N/A'}
                </Typography>
                <Box sx={{ flexGrow: 1, position: 'relative' }}>
                  {chartDataLoading[chart.id] ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress />
                    </Box>
                  ) : chartsData[chart.id] && chartsData[chart.id].length > 0 ? (
                    <ChartRenderer
                      type={chart.type as ChartType}
                      data={chartsData[chart.id]}
                      configuration={chart.configuration}
                      style={{ height: '100%' }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                      <Typography>No data or failed to load for this chart.</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Typography variant="h6" color="textSecondary">
              No charts added to this dashboard yet.
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              component={Link}
              to={`/charts/new?dashboardId=${dashboard.id}`}
              sx={{ mt: 2 }}
            >
              Add Your First Chart
            </Button>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default DashboardViewPage;
```