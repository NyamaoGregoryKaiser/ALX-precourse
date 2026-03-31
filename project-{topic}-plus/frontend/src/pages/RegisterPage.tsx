```typescript
import React from 'react';
import AuthForm from '../components/AuthForm';
import Header from '../components/Header';

const RegisterPage: React.FC = () => {
  return (
    <div className="container">
      <Header />
      <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <AuthForm type="register" />
      </div>
    </div>
  );
};

export default RegisterPage;
```