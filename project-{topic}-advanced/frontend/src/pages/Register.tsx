```tsx
import React from 'react';
import AuthForm from '../components/AuthForm';
import { Box, Typography } from '@mui/material';

const Register: React.FC = () => {
  return (
    <Box sx={{ textAlign: 'center', mt: 5 }}>
      <AuthForm type="register" />
    </Box>
  );
};

export default Register;
```

#### `frontend/src/pages/Dashboard.tsx`