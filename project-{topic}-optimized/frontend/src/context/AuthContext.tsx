import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import api from '../api/api';
import { jwtDecode } from 'jwt-decode';
import { AuthContextType, AuthUser, LoginUser, RegisterUser } from '../types';

// Define the shape of the decoded JWT token
interface DecodedToken {
  username: string;
  sub: string; // User ID
  roles: string[];
  exp: number; // Expiration timestamp
}

/**
 * Default context value for authentication.
 * Used when the context is not yet populated or when accessed outside AuthProvider.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * `AuthProvider` component manages the global authentication state.
 * It provides `user`, `isAuthenticated`, `isLoading`, `login`, `register`, and `logout`
 * functions to its children components via the `AuthContext`.
 *
 * It handles:
 * - Storing/retrieving JWT token from localStorage.
 * - Decoding token to get user information.
 * - Checking token validity and expiration.
 * - Exposing authentication state and actions.
 *
 * @param {object} props - Component props.
 * @param {ReactNode} props.children - The child components to be rendered within the provider.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Tracks initial authentication check

  /**
   * Decodes a JWT token and sets the user state.
   * Also checks if the token is expired.
   * @param {string} token - The JWT access token.
   */
  const decodeAndSetUser = useCallback((token: string) => {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000; // Convert to seconds

      if (decoded.exp < currentTime) {
        // Token expired
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      setUser({
        id: decoded.sub,
        username: decoded.username,
        roles: decoded.roles,
      });
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Effect hook to check for an existing token in localStorage on initial load.
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      decodeAndSetUser(token);
    }
    setIsLoading(false); // Authentication check complete
  }, [decodeAndSetUser]);

  /**
   * Handles user login.
   * Makes an API call, stores the token, and updates authentication state.
   * @param {LoginUser} credentials - User login credentials.
   * @returns {Promise<void>}
   */
  const login = async (credentials: LoginUser) => {
    const response = await api.post<{ access_token: string }>('/auth/login', credentials);
    const token = response.data.access_token;
    localStorage.setItem('token', token);
    decodeAndSetUser(token);
  };

  /**
   * Handles user registration.
   * Makes an API call to register a new user.
   * @param {RegisterUser} userData - New user registration data.
   * @returns {Promise<void>}
   */
  const register = async (userData: RegisterUser) => {
    await api.post('/auth/register', userData);
    // No token is returned directly on register, user must log in after
  };

  /**
   * Handles user logout.
   * Clears the token from localStorage and resets authentication state.
   */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    // Optionally clear cache if implemented via client
    // queryClient.clear();
  };

  const authContextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

export default AuthContext;