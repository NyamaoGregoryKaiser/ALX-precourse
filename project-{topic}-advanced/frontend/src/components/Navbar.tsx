```tsx
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <AppBar position="static" sx={{ bgcolor: '#2c3e50' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <RouterLink to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            SQLInsight Pro
          </RouterLink>
        </Typography>
        <Box>
          {isAuthenticated ? (
            <>
              <Button color="inherit" component={RouterLink} to="/dashboard">
                Dashboard
              </Button>
              <Button color="inherit" component={RouterLink} to="/queries">
                Queries
              </Button>
              <Button color="inherit" component={RouterLink} to="/databases">
                Databases
              </Button>
              {user?.role === 'admin' && (
                 <Button color="inherit" component={RouterLink} to="/admin/users">
                 Users
               </Button>
              )}
              <Button color="inherit" onClick={logout}>
                Logout ({user?.email})
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
```

#### `frontend/src/components/Layout.tsx`