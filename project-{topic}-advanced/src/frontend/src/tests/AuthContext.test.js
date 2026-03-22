```javascript
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { jwtDecode } from 'jwt-decode'; // Import the actual jwtDecode

// Mock jwt-decode to control its behavior
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

describe('AuthContext', () => {
  const mockUser = { id: '123', email: 'test@example.com', role: 'user' };
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('initializes as unauthenticated if no token/user in localStorage', () => {
    (jwtDecode).mockReturnValue({ exp: Date.now() / 1000 + 3600 }); // Valid token
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('initializes as authenticated if valid token and user in localStorage', () => {
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));
    (jwtDecode).mockReturnValue({ exp: Date.now() / 1000 + 3600 }); // Token expires in 1 hour

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('initializes as unauthenticated if token is expired', () => {
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));
    (jwtDecode).mockReturnValue({ exp: Date.now() / 1000 - 3600 }); // Token expired 1 hour ago

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('logs in a user correctly', () => {
    (jwtDecode).mockReturnValue({ exp: Date.now() / 1000 + 3600 });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.login(mockToken, mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem('token')).toBe(mockToken);
    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
  });

  it('logs out a user correctly', () => {
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));
    (jwtDecode).mockReturnValue({ exp: Date.now() / 1000 + 3600 });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('handles invalid token in localStorage gracefully', () => {
    localStorage.setItem('token', 'invalid.token.format');
    localStorage.setItem('user', JSON.stringify(mockUser));
    (jwtDecode).mockImplementation(() => { throw new Error('Invalid token'); }); // Simulate jwtDecode failure

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
```