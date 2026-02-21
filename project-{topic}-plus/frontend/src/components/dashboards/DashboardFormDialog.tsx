```typescript
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import { Dashboard } from '../../types';
import axiosInstance from '../../api/axios';
import { useNotification } from '../../contexts/NotificationContext';

interface DashboardFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void; // Callback to refresh list
  dashboard?: Dashboard | null; // Optional: dashboard object for editing
}

const DashboardFormDialog: React.FC<DashboardFormDialogProps> = ({ open, onClose, onSubmit, dashboard }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (dashboard) {
      setName(dashboard.name);
      setDescription(dashboard.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [dashboard, open]); // Reset form when dialog opens or dashboard changes

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (dashboard) {
        await axiosInstance.put(`/dashboards/${dashboard.id}`, { name, description });
        showNotification('Dashboard updated successfully!', 'success');
      } else {
        await axiosInstance.post('/dashboards', { name, description });
        showNotification('Dashboard created successfully!', 'success');
      }
      onSubmit(); // Call parent's onSubmit to refresh data
      onClose(); // Close dialog
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'Failed to save dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{dashboard ? 'Edit Dashboard' : 'Create New Dashboard'}</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          label="Dashboard Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Description"
          type="text"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : (dashboard ? 'Update' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DashboardFormDialog;
```