```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthContext, AuthTokens, User } from '../../src/context/AuthContext';
import Navbar from '../../src/components/Navbar';
import * as authApi from '../../src/api/auth';
import { toast } from 'react-toastify';

// Mock the react-toastify module
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the logoutUser API call
jest.mock('../../src/api/auth', () => ({
  logoutUser: jest.fn(),
}));

const mockLogoutUser = authApi.logoutUser as jest.Mock;
const mockToastSuccess = toast.success as jest.Mock;
const mockToastError = toast.error as jest.Mock;

const mockUser: User = {
  id: '123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
};

const mockAdminUser: User = {
  id: '456',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
};

const mockAuthContextValue = (isAuthenticated: boolean, user: User | null, loading: boolean = false) => ({
  user,
  isAuthenticated,
  loading,
  login: jest.fn(),
  logout: jest.fn(),
  refreshAccessToken: jest.fn(),
  updateUser: jest.fn(),
});

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login and register links when not authenticated', () => {
    render(
      <Router>
        <AuthContext.Provider value={mockAuthContextValue(false, null)}>
          <Navbar />
        </AuthContext.Provider>
      </Router>
    );

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });

  it('renders dashboard, profile, and logout button when authenticated as a regular user', () => {
    render(
      <Router>
        <AuthContext.Provider value={mockAuthContextValue(true, mockUser)}>
          <Navbar />
        </AuthContext.Provider>
      </Router>
    );

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout \(test@example.com\)/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /login/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin users/i })).not.toBeInTheDocument();
  });

  it('renders admin users link when authenticated as an admin', () => {
    render(
      <Router>
        <AuthContext.Provider value={mockAuthContextValue(true, mockAdminUser)}>
          <Navbar />
        </AuthContext.Provider>
      </Router>
    );

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin users/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout \(admin@example.com\)/i })).toBeInTheDocument();
  });

  it('calls logout function and shows success toast on successful logout', async () => {
    mockLogoutUser.mockResolvedValueOnce({ message: 'Logged out successfully!' });
    const mockAuthContext = mockAuthContextValue(true, mockUser);

    render(
      <Router>
        <AuthContext.Provider value={mockAuthContext}>
          <Navbar />
        </AuthContext.Provider>
      </Router>
    );

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(mockLogoutUser).toHaveBeenCalledTimes(1);
      expect(mockAuthContext.logout).toHaveBeenCalledTimes(1);
      expect(mockToastSuccess).toHaveBeenCalledWith('Logged out successfully!');
    });
  });

  it('shows error toast on failed logout', async () => {
    const errorMessage = 'Network error during logout.';
    mockLogoutUser.mockRejectedValueOnce({ response: { data: { message: errorMessage } } });
    const mockAuthContext = mockAuthContextValue(true, mockUser);

    render(
      <Router>
        <AuthContext.Provider value={mockAuthContext}>
          <Navbar />
        </AuthContext.Provider>
      </Router>
    );

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(mockLogoutUser).toHaveBeenCalledTimes(1);
      expect(mockAuthContext.logout).not.toHaveBeenCalled(); // Client-side logout only happens on success
      expect(mockToastError).toHaveBeenCalledWith(errorMessage);
    });
  });
});
```