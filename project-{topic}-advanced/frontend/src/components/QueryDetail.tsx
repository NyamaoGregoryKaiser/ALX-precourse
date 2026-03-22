```tsx
import React, { useState } from 'react';
import { SlowQuery, QuerySuggestion, SuggestionStatus } from '../types';
import {
  Box, Typography, Paper, Chip, Divider, List, ListItem, ListItemText, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DatabaseIcon from '@mui/icons-material/Storage';
import AppIcon from '@mui/icons-material/Apps';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import Highlight from 'react-highlight'; // For SQL syntax highlighting
import 'highlight.js/styles/github.css'; // Or any other style

interface QueryDetailProps {
  slowQuery: SlowQuery;
  onUpdateSuggestion: (queryId: string, suggestionId: string, status: SuggestionStatus, feedback?: string) => Promise<void>;
}

const getSuggestionIcon = (status: SuggestionStatus) => {
  switch (status) {
    case 'applied': return <CheckCircleIcon color="success" />;
    case 'dismissed': return <CancelIcon color="error" />;
    case 'pending': return <PendingIcon color="warning" />;
    default: return null;
  }
};

const QueryDetail: React.FC<QueryDetailProps> = ({ slowQuery, onUpdateSuggestion }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<QuerySuggestion | null>(null);
  const [newStatus, setNewStatus] = useState<SuggestionStatus>('pending');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOpenDialog = (suggestion: QuerySuggestion, currentStatus: SuggestionStatus) => {
    setSelectedSuggestion(suggestion);
    setNewStatus(currentStatus);
    setFeedback(suggestion.feedback || '');
    setError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSuggestion(null);
    setFeedback('');
    setError(null);
  };

  const handleUpdate = async () => {
    if (!selectedSuggestion) return;
    try {
      await onUpdateSuggestion(slowQuery.id, selectedSuggestion.id, newStatus, feedback);
      handleCloseDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update suggestion status.');
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms} ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)} s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(2)} min`;
  };

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: '12px' }}>
      <Typography variant="h4" component="h2" gutterBottom sx={{ color: '#1a237e', fontWeight: 'bold' }}>
        Slow Query Details
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Chip icon={<AccessTimeIcon />} label={`Execution Time: ${formatTime(slowQuery.executionTimeMs)}`} color="secondary" />
        <Chip icon={<DatabaseIcon />} label={`Database: ${slowQuery.database?.name || 'N/A'} (${slowQuery.database?.type})`} variant="outlined" />
        {slowQuery.clientApplication && <Chip icon={<AppIcon />} label={`Application: ${slowQuery.clientApplication}`} variant="outlined" />}
        {slowQuery.clientHostname && <Chip icon={<CodeIcon />} label={`Hostname: ${slowQuery.clientHostname}`} variant="outlined" />}
      </Box>

      <Typography variant="h5" sx={{ mb: 1, color: '#3f51b5' }}>
        SQL Query
      </Typography>
      <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: '8px', mb: 3, overflowX: 'auto' }}>
        <Highlight language="sql">
          {slowQuery.query}
        </Highlight>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" sx={{ mb: 2, color: '#3f51b5' }}>
        Query Plans ({slowQuery.queryPlans.length})
      </Typography>
      {slowQuery.queryPlans && slowQuery.queryPlans.length > 0 ? (
        <List>
          {slowQuery.queryPlans.map((plan, index) => (
            <Paper key={plan.id} variant="outlined" sx={{ mb: 2, p: 2, bgcolor: '#fafafa' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Plan #{index + 1} ({new Date(plan.generatedAt).toLocaleString()})
              </Typography>
              {plan.totalCost && <Typography variant="body2">Total Cost: {plan.totalCost.toFixed(2)}</Typography>}
              {plan.actualRows && <Typography variant="body2">Actual Rows: {plan.actualRows}</Typography>}
              <Box sx={{ bgcolor: '#eee', p: 1.5, borderRadius: '4px', mt: 1, overflowX: 'auto', maxHeight: '300px' }}>
                <Highlight language="json">
                  {JSON.stringify(plan.planData, null, 2)}
                </Highlight>
              </Box>
            </Paper>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">No query plans available.</Typography>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" sx={{ mb: 2, color: '#3f51b5' }}>
        Optimization Suggestions ({slowQuery.querySuggestions.length})
      </Typography>
      {slowQuery.querySuggestions && slowQuery.querySuggestions.length > 0 ? (
        <List>
          {slowQuery.querySuggestions.map((suggestion) => (
            <Paper key={suggestion.id} variant="outlined" sx={{ mb: 2, p: 2, bgcolor: '#fafafa' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {suggestion.type.replace(/_/g, ' ').toUpperCase()}
                </Typography>
                <Chip
                  icon={getSuggestionIcon(suggestion.status)}
                  label={suggestion.status.toUpperCase()}
                  color={suggestion.status === 'applied' ? 'success' : suggestion.status === 'dismissed' ? 'error' : 'warning'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}>{suggestion.description}</Typography>
              {suggestion.sqlStatement && (
                <Box sx={{ bgcolor: '#eee', p: 1.5, borderRadius: '4px', mt: 1, mb: 1, overflowX: 'auto' }}>
                   <Highlight language="sql">
                     {suggestion.sqlStatement}
                   </Highlight>
                </Box>
              )}
              {suggestion.feedback && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Feedback: {suggestion.feedback}
                </Typography>
              )}
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small" onClick={() => handleOpenDialog(suggestion, 'applied')}>
                  Mark as Applied
                </Button>
                <Button variant="outlined" size="small" onClick={() => handleOpenDialog(suggestion, 'dismissed')}>
                  Mark as Dismissed
                </Button>
              </Box>
            </Paper>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">No optimization suggestions generated for this query yet.</Typography>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>Update Suggestion Status</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Typography variant="body1" sx={{ mb: 2 }}>
            Updating status for: <strong>{selectedSuggestion?.description}</strong>
          </Typography>
          <TextField
            select
            label="Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as SuggestionStatus)}
            fullWidth
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="pending">Pending</option>
            <option value="applied">Applied</option>
            <option value="dismissed">Dismissed</option>
          </TextField>
          <TextField
            label="Feedback (optional)"
            multiline
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            fullWidth
            margin="normal"
            placeholder="Add any notes about applying or dismissing this suggestion..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleUpdate} color="primary" variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default QueryDetail;
```

#### `frontend/src/pages/Login.tsx`