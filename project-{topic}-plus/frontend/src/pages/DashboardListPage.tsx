```typescript
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, CardActions, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link, useNavigate } from 'react-router-dom';
import { Dashboard } from '../types';
import axiosInstance from '../api/axios';
import { useNotification } from '../contexts/NotificationContext';
import DashboardFormDialog from '../components/dashboards/DashboardFormDialog';

const DashboardListPage: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);

  const fetchDashboards = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/dashboards');
      setDashboards(response.data.data);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to fetch dashboards', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  const handleDeleteDashboard = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this dashboard?')) return;
    try {
      await axiosInstance.delete(`/dashboards/${id}`);
      showNotification('Dashboard deleted successfully!', 'success');
      fetchDashboards(); // Re-fetch list
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to delete dashboard', 'error');
    }
  };

  const handleOpenCreateDialog = () => {
    setCurrentDashboard(null);
    setOpenFormDialog(true);
  };

  const handleOpenEditDialog = (dashboard: Dashboard) => {
    setCurrentDashboard(dashboard);
    setOpenFormDialog(true);
  };

  const handleFormSubmit = () => {
    setOpenFormDialog(false);
    fetchDashboards(); // Refresh list after create/update
  };

  if (loading) {
    return <Typography>Loading dashboards...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Your Dashboards
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Create New Dashboard
        </Button>
      </Box>

      {dashboards.length === 0 ? (
        <Typography variant="h6" color="textSecondary">
          No dashboards found. Create one to get started!
        </Typography>
      ) : (
        <Grid container spacing={4}>
          {dashboards.map((dashboard) => (
            <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
              <Card raised sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Link to={`/dashboards/${dashboard.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="h5" component="h2" gutterBottom>
                      {dashboard.name}
                    </Typography>
                  </Link>
                  <Typography variant="body2" color="textSecondary">
                    {dashboard.description || 'No description provided.'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                    Charts: {dashboard.charts?.length || 0}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', padding: 2 }}>
                  <IconButton onClick={() => handleOpenEditDialog(dashboard)} color="info">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteDashboard(dashboard.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                  <Button size="small" component={Link} to={`/dashboards/${dashboard.id}`}>
                    View Dashboard
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <DashboardFormDialog
        open={openFormDialog}
        onClose={() => setOpenFormDialog(false)}
        onSubmit={handleFormSubmit}
        dashboard={currentDashboard}
      />
    </Box>
  );
};

export default DashboardListPage;
```