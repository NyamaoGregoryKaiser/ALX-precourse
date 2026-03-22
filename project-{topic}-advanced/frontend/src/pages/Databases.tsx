```tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Alert, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select, SelectChangeEvent, Paper
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import * as api from '../services/api';
import { Database, DatabaseType } from '../types';
import { toast } from 'react-toastify';

const Databases: React.FC = () => {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentDb, setCurrentDb] = useState<Partial<Database> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDatabases();
      if (res.data.success) {
        setDatabases(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load databases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setCurrentDb({ name: '', type: DatabaseType.POSTGRES, connectionString: '', description: '' });
    setFormError(null);
    setOpen(true);
  };

  const handleOpenEdit = (db: Database) => {
    setIsEdit(true);
    setCurrentDb(db);
    setFormError(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<DatabaseType>) => {
    const { name, value } = e.target;
    setCurrentDb((prev) => ({ ...prev, [name]: value } as Partial<Database>));
  };

  const handleSubmit = async () => {
    if (!currentDb || !currentDb.name || !currentDb.type || !currentDb.connectionString) {
      setFormError('Name, type, and connection string are required.');
      return;
    }

    setFormError(null);
    try {
      if (isEdit && currentDb.id) {
        await api.updateDatabase(currentDb.id, currentDb);
        toast.success('Database updated successfully!');
      } else {
        await api.createDatabase(currentDb);
        toast.success('Database created successfully!');
      }
      fetchDatabases();
      handleClose();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save database.');
      console.error('Database save error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this database? All associated slow queries and suggestions will also be deleted.')) {
      try {
        await api.deleteDatabase(id);
        toast.success('Database deleted successfully!');
        fetchDatabases();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete database.');
        console.error('Database delete error:', err);
      }
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Monitored Databases
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Add New Database
        </Button>
      </Box>

      {databases.length === 0 ? (
        <Alert severity="info">No databases registered yet. Click "Add New Database" to get started.</Alert>
      ) : (
        <Paper elevation={1}>
          <List>
            {databases.map((db) => (
              <ListItem key={db.id} divider>
                <ListItemText
                  primary={<Typography variant="h6">{db.name} ({db.type})</Typography>}
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        <strong>Connection String:</strong> {db.connectionString}
                      </Typography>
                      {db.description && <Typography variant="body2"><strong>Description:</strong> {db.description}</Typography>}
                      <Typography variant="caption" color="text.secondary">
                        Owner: {db.owner?.email || 'N/A'} | Created: {new Date(db.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEdit(db)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(db.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{isEdit ? 'Edit Database' : 'Add New Database'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Database Name"
            type="text"
            fullWidth
            value={currentDb?.name || ''}
            onChange={handleChange}
            required
          />
          <FormControl fullWidth margin="dense" required>
            <InputLabel>Database Type</InputLabel>
            <Select
              name="type"
              value={currentDb?.type || DatabaseType.POSTGRES}
              label="Database Type"
              onChange={handleChange}
            >
              {Object.values(DatabaseType).map((type) => (
                <MenuItem key={type} value={type}>{type.toUpperCase()}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            name="connectionString"
            label="Connection String"
            type="text"
            fullWidth
            value={currentDb?.connectionString || ''}
            onChange={handleChange}
            required
            helperText="e.g., postgresql://user:pass@host:5432/dbname"
          />
          <TextField
            margin="dense"
            name="description"
            label="Description (Optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={currentDb?.description || ''}
            onChange={handleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {isEdit ? 'Save Changes' : 'Add Database'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Databases;
```

#### `frontend/src/pages/AdminUsers.tsx` (Admin-only page)