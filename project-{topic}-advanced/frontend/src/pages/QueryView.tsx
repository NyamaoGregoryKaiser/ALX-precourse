```tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import * as api from '../services/api';
import { SlowQuery, SuggestionStatus } from '../types';
import QueryDetail from '../components/QueryDetail';
import { toast } from 'react-toastify';

const QueryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [slowQuery, setSlowQuery] = useState<SlowQuery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueryDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSlowQuery(id);
      if (res.data.success) {
        setSlowQuery(res.data.data);
      } else {
        setError(res.data.message || 'Failed to load query details.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load query details.');
      console.error('Query detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueryDetails();
  }, [id]);

  const handleUpdateSuggestionStatus = async (queryId: string, suggestionId: string, status: SuggestionStatus, feedback?: string) => {
    try {
      const res = await api.updateQuerySuggestionStatus(queryId, suggestionId, status, feedback);
      if (res.data.success) {
        toast.success('Suggestion status updated successfully!');
        // Re-fetch query details to update the UI
        await fetchQueryDetails();
      } else {
        toast.error(res.data.message || 'Failed to update suggestion status.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update suggestion status.');
      console.error('Update suggestion status error:', err);
      throw err; // Re-throw to allow dialog to show error
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!slowQuery) {
    return <Alert severity="info">No query found with ID: {id}</Alert>;
  }

  return (
    <Box>
      <QueryDetail slowQuery={slowQuery} onUpdateSuggestion={handleUpdateSuggestionStatus} />
    </Box>
  );
};

export default QueryView;
```

#### `frontend/src/pages/Databases.tsx`