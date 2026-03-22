```tsx
import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Link, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AuthFormProps {
  type: 'login' | 'register';
}

const AuthForm: React.FC<AuthFormProps> = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (type === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password });
      }
      // Redirection handled by AuthContext on success
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'An unexpected error occurred.';
      setError(errorMessage);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxWidth: 400,
        margin: 'auto',
        p: 3,
        border: '1px solid #ccc',
        borderRadius: '8px',
        mt: 5,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom textAlign="center">
        {type === 'login' ? 'Login to SQLInsight Pro' : 'Register for SQLInsight Pro'}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
        variant="outlined"
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
        variant="outlined"
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        disabled={loading}
        sx={{ py: 1.5 }}
      >
        {loading ? 'Loading...' : (type === 'login' ? 'Login' : 'Register')}
      </Button>
      <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
        {type === 'login' ? (
          <>
            Don't have an account?{' '}
            <Link component="button" onClick={() => navigate('/register')}>
              Register
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link component="button" onClick={() => navigate('/login')}>
              Login
            </Link>
          </>
        )}
      </Typography>
    </Box>
  );
};

export default AuthForm;
```

#### `frontend/src/components/Navbar.tsx`