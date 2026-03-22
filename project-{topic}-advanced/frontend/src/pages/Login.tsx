```tsx
import React from 'react';
import AuthForm from '../components/AuthForm';
import { Box, Typography } from '@mui/material';

const Login: React.FC = () => {
  return (
    <Box sx={{ textAlign: 'center', mt: 5 }}>
      <AuthForm type="login" />
    </Box>
  );
};

export default Login;
```

#### `frontend/src/pages/Register.tsx`