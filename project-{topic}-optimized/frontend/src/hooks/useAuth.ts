import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { AuthContextType } from '../types';

/**
 * Custom hook `useAuth` to access the authentication context.
 * It provides a convenient way to get the current user, authentication status,
 * and authentication actions (login, register, logout) from anywhere in the component tree.
 *
 * @returns {AuthContextType} The authentication context object.
 * @throws {Error} If `useAuth` is used outside of an `AuthProvider`.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### `frontend/src/pages/DashboardPage.tsx`
```tsx