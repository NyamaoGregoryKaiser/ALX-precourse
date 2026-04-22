```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const useAuthRedirect = (redirectTo: string = '/dashboards', requireAuth: boolean = true) => {
    const { isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            if (requireAuth && !isAuthenticated) {
                navigate('/login', { replace: true });
            } else if (!requireAuth && isAuthenticated) {
                navigate(redirectTo, { replace: true });
            }
        }
    }, [isAuthenticated, loading, navigate, redirectTo, requireAuth]);
};
```