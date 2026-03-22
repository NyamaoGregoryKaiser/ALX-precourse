```tsx
import React, { useEffect, useState } from 'react';
import { Typography, Box, Grid, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { SlowQuery, Database, User } from '../types';
import DatabaseIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import PersonIcon from '@mui/icons-material/Person';

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalQueries: 0,
    totalDatabases: 0,
    totalUsers: 0,
    avgExecutionTime: 0,
    recentSlowQueries: [] as SlowQuery[],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (authLoading || !user) return; // Wait for user to be loaded

      setLoading(true);
      setError(null);
      try {
        // Fetch slow queries (limit to a few recent ones for dashboard)
        const queriesRes = await api.getSlowQueries({ page: 1, limit: 5, sortBy: 'reportedAt', sortOrder: 'DESC' });
        const recentSlowQueries = queriesRes.data.data || [];
        const totalQueries = queriesRes.data.meta?.total || 0;

        // Fetch databases
        const databasesRes = await api.getDatabases();
        const databases = databasesRes.data.data || [];
        const totalDatabases = databases.length;

        // Calculate average execution time
        const allQueriesForAvgRes = await api.getSlowQueries({ page: 1, limit: 9999 }); // Fetch all for avg calculation
        const allQueries = allQueriesForAvgRes.data.data || [];
        const totalExecutionTime = allQueries.reduce((sum, q) => sum + q.executionTimeMs, 0);
        const avgExecutionTime = allQueries.length > 0 ? totalExecutionTime / allQueries.length : 0;

        let totalUsers = 0;
        if (user.role === 'admin') {
          const usersRes = await api.getUsers();
          totalUsers = usersRes.data.data?.length || 0;
        }

        setStats({
          totalQueries,
          totalDatabases,
          totalUsers,
          avgExecutionTime,
          recentSlowQueries,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch dashboard data.');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    const seconds = ms / 1000;
    return `${seconds.toFixed(2)} s`;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.email}!
      </Typography>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        Dashboard Overview
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <QueryStatsIcon fontSize="large" color="primary" />
              <Box>
                <Typography variant="h6">Total Slow Queries</Typography>
                <Typography variant="h4" color="primary">{stats.totalQueries}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DatabaseIcon fontSize="large" color="success" />
              <Box>
                <Typography variant="h6">Monitored Databases</Typography>
                <Typography variant="h4" color="success">{stats.totalDatabases}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SpeedIcon fontSize="large" color="warning" />
              <Box>
                <Typography variant="h6">Avg. Query Time</Typography>
                <Typography variant="h4" color="warning">{formatTime(stats.avgExecutionTime)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {user?.role === 'admin' && (
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PersonIcon fontSize="large" color="info" />
                <Box>
                  <Typography variant="h6">Registered Users</Typography>
                  <Typography variant="h4" color="info">{stats.totalUsers}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Box sx={{ mt: 5 }}>
        <Typography variant="h5" component="h3" gutterBottom>
          Recent Slow Queries
        </Typography>
        {stats.recentSlowQueries.length > 0 ? (
          <Grid container spacing={2}>
            {stats.recentSlowQueries.map((query) => (
              <Grid item xs={12} sm={6} md={4} key={query.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      DB: {query.database?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {query.query}
                    </Typography>
                    <Typography variant="caption" color="text.primary">
                      {formatTime(query.executionTimeMs)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography>No recent slow queries reported.</Typography>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;
```

#### `frontend/src/pages/Queries.tsx`