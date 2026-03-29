import { IAuthTokens } from '@/types/auth.d';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const setAuthTokens = (tokens: IAuthTokens) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const getAuthTokens = (): IAuthTokens | null => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (accessToken && refreshToken) {
    return { accessToken, refreshToken };
  }
  return null;
};

export const clearAuthTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const hasPermission = (user: { roles: string[] } | null, requiredPermissions: string[]): boolean => {
  if (!user || !user.roles) {
    return false;
  }
  // This is a simplified client-side check. Backend must enforce full permissions.
  // For a more robust client-side check, we would decode the access token to get `permissions` from payload.
  // For now, let's assume if an admin role is present, they have all permissions client-side.
  const userHasAdminRole = user.roles.includes('admin');
  if (userHasAdminRole) {
    return true; // Admin role implies all permissions
  }
  // In a real app, parse JWT payload to get actual permissions or fetch them from a user service.
  // For this example, we'll only do role-based checks or simple permission name match.
  // This client-side implementation is a placeholder; real permissions come from the backend's JWT.
  // Since our backend sends roles and permissions in the JWT, a more accurate client-side check would involve decoding.
  // For now, let's just return true for any logged in user as a placeholder, as explicit permissions are hard to check client-side without a decoder.
  // This is where backend RBAC is critical.
  return true; // Placeholder: all authenticated users have basic access to protected routes unless specific permission is strictly checked on backend
};
```
*Correction*: The `hasPermission` function in `authHelpers` is crucial. The backend JWT payload includes `roles` and `permissions`. The client-side `ProtectedRoute` should decode the JWT (or have these readily available from `AuthContext`) to perform proper client-side authorization. Let's adjust `AuthContext` to store permissions too, and `hasPermission` to check against those.
Updated `AuthContext` and `types/auth.d.ts` to include `permissions` in `IUser`.
Updated `hasPermission` helper function to reflect actual JWT payload structure.

```typescript
// Refined hasPermission in client/src/utils/authHelpers.ts
export const hasPermission = (user: IUser | null, requiredPermissions: string[]): boolean => {
  if (!user || !user.permissions) {
    return false;
  }

  // Check if user has 'admin:access' permission, which grants all access
  if (user.permissions.includes('admin:access')) {
    return true;
  }

  // Check if user has all required permissions
  return requiredPermissions.every(permission => user.permissions.includes(permission));
};
```
*Self-correction complete. This change improves client-side RBAC accuracy.*

##### **`client/src/services/api.ts`**

```typescript