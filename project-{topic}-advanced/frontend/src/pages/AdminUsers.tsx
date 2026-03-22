```tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Alert, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select, SelectChangeEvent, Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import * as api from '../services/api';
import { User, UserRole } from '../types';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth(); // Current logged-in user
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [currentEditUser, setCurrentEditUser] = useState<Partial<User> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getUsers();
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
      fetchUsers();
    } else {
      setError('You are not authorized to view this page.');
      setLoading(false);
    }
  }, [currentUser]);

  const handleOpenEdit = (user: User) => {
    setCurrentEditUser(user);
    setFormError(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<UserRole>) => {
    const { name, value } = e.target;
    setCurrentEditUser((prev) => ({ ...prev, [name]: value } as Partial<User>));
  };

  const handleSubmit = async () => {
    if (!currentEditUser?.id) return;
    if (!currentEditUser.email || !currentEditUser.role) {
      setFormError('Email and Role are required.');
      return;
    }

    setFormError(null);
    try {
      await api.updateUser(currentEditUser.id, { email: currentEditUser.email, role: currentEditUser.role });
      toast.success('User updated successfully!');
      fetchUsers();
      handleClose();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update user.');
      console.error('User update error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (currentUser?.id === id) {
        toast.error('You cannot delete your own account.');
        return;
    }
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.deleteUser(id);
        toast.success('User deleted successfully!');
        fetchUsers();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete user.');
        console.error('User delete error:', err);
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
          User Management
        </Typography>
        {/* Potentially add 'Add User' button here, but for now, registration handles it. */}
      </Box>

      {users.length === 0 ? (
        <Alert severity="info">No users found.</Alert>
      ) : (
        <Paper elevation={1}>
          <List>
            {users.map((user) => (
              <ListItem key={user.id} divider>
                <ListItemText
                  primary={<Typography variant="h6">{user.email}</Typography>}
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        <strong>Role:</strong> {user.role.toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {user.id} | Created: {new Date(user.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEdit(user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(user.id)} color="error" disabled={currentUser?.id === user.id}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            value={currentEditUser?.email || ''}
            onChange={handleChange}
            required
          />
          <FormControl fullWidth margin="dense" required>
            <InputLabel>User Role</InputLabel>
            <Select
              name="role"
              value={currentEditUser?.role || UserRole.USER}
              label="User Role"
              onChange={handleChange}
              // Prevent admin from changing their own role or other admin's role
              disabled={currentUser?.id === currentEditUser?.id && currentUser?.role === UserRole.ADMIN}
            >
              <MenuItem value={UserRole.USER}>{UserRole.USER.toUpperCase()}</MenuItem>
              <MenuItem value={UserRole.ADMIN}>{UserRole.ADMIN.toUpperCase()}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsers;
```

#### `frontend/src/App.tsx`