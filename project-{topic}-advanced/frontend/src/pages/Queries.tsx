```tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Alert, Pagination, FormControl, InputLabel, Select, MenuItem,
  SelectChangeEvent, TextField, Button, Grid
} from '@mui/material';
import QueryCard from '../components/QueryCard';
import * as api from '../services/api';
import { SlowQuery, Database, PagingOptions } from '../types';

const Queries: React.FC = () => {
  const [queries, setQueries] = useState<SlowQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>('');
  const [minExecutionTimeMs, setMinExecutionTimeMs] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<PagingOptions['sortBy']>('reportedAt');
  const [sortOrder, setSortOrder] = useState<PagingOptions['sortOrder']>('DESC');

  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        const res = await api.getDatabases();
        if (res.data.success) {
          setDatabases(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load databases.');
      }
    };
    fetchDatabases();
  }, []);

  useEffect(() => {
    const fetchQueries = async () => {
      setLoading(true);
      setError(null);
      try {
        const options: PagingOptions = {
          page,
          limit,
          sortBy,
          sortOrder,
        };
        if (selectedDatabaseId) {
          options.databaseId = selectedDatabaseId;
        }
        if (minExecutionTimeMs !== '') {
          options.minExecutionTimeMs = minExecutionTimeMs;
        }

        const res = await api.getSlowQueries(options);
        if (res.data.success) {
          setQueries(res.data.data);
          setTotalItems(res.data.meta?.total || 0);
          setTotalPages(res.data.meta?.totalPages || 1);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load slow queries.');
        console.error('Failed to load queries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueries();
  }, [page, limit, selectedDatabaseId, minExecutionTimeMs, sortBy, sortOrder]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleLimitChange = (event: SelectChangeEvent<number>) => {
    setLimit(Number(event.target.value));
    setPage(1); // Reset to first page when limit changes
  };

  const handleDatabaseChange = (event: SelectChangeEvent<string>) => {
    setSelectedDatabaseId(event.target.value);
    setPage(1);
  };

  const handleMinExecutionTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMinExecutionTimeMs(value === '' ? '' : Number(value));
    setPage(1);
  };

  const handleSortByChange = (event: SelectChangeEvent<PagingOptions['sortBy']>) => {
    setSortBy(event.target.value as PagingOptions['sortBy']);
    setPage(1);
  };

  const handleSortOrderChange = (event: SelectChangeEvent<PagingOptions['sortOrder']>) => {
    setSortOrder(event.target.value as PagingOptions['sortOrder']);
    setPage(1);
  };

  if (loading && queries.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Slow Queries
      </Typography>

      <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Database</InputLabel>
          <Select
            value={selectedDatabaseId}
            label="Database"
            onChange={handleDatabaseChange}
          >
            <MenuItem value="">
              <em>All Databases</em>
            </MenuItem>
            {databases.map((db) => (
              <MenuItem key={db.id} value={db.id}>
                {db.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Min Exec. Time (ms)"
          type="number"
          value={minExecutionTimeMs}
          onChange={handleMinExecutionTimeChange}
          inputProps={{ min: 0 }}
          sx={{ width: 180 }}
        />

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={handleSortByChange}
          >
            <MenuItem value="reportedAt">Reported At</MenuItem>
            <MenuItem value="executionTimeMs">Execution Time</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Order</InputLabel>
          <Select
            value={sortOrder}
            label="Order"
            onChange={handleSortOrderChange}
          >
            <MenuItem value="DESC">Descending</MenuItem>
            <MenuItem value="ASC">Ascending</MenuItem>
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={() => {
          setSelectedDatabaseId('');
          setMinExecutionTimeMs('');
          setSortBy('reportedAt');
          setSortOrder('DESC');
          setPage(1);
        }}>
          Reset Filters
        </Button>
      </Paper>


      {queries.length === 0 && !loading ? (
        <Alert severity="info">No slow queries found matching your criteria.</Alert>
      ) : (
        <Box>
          {queries.map((query) => (
            <QueryCard key={query.id} query={query} />
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">Items per page:</Typography>
            <FormControl size="small">
              <Select value={limit} onChange={handleLimitChange} sx={{ height: '30px' }}>
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2">
              Showing {Math.min((page - 1) * limit + 1, totalItems)} - {Math.min(page * limit, totalItems)} of {totalItems} queries
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Queries;
```

#### `frontend/src/pages/QueryView.tsx`