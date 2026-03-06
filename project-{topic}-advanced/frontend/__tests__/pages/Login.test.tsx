```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthContext, AuthTokens, User } from '../../src/context/AuthContext';
import LoginPage from '../../src/pages/Login';
import * as authApi from '../../src/api/auth';
import { toast } from 'react-toastify';

// Mock the react-toastify module
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the loginUser API call
jest.mock('../../src/api/auth', () => ({
  loginUser: jest.fn(),
}));

const mockLoginUser = authApi.loginUser as jest.Mock;
const mockToastSuccess = toast.success as jest.Mock;
const mockToastError = toast.error as jest.Mock;

const mockUser: User = {
  id: '123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
};

const mockTokens: AuthTokens = {
  accessToken: 'mockAccessToken',
  refreshToken: 'mockRefreshToken',
  accessExpires: new Date(Date.now() + 30 * 60 * 1000),
  refreshExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

const mockAuthContextValue = () => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  refreshAccessToken: jest.fn(),
  updateUser: jest.fn(),
});

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(
      <Router>
        <AuthContext.Provider value={mockAuthContextValue()}>
          <LoginPage />
        </AuthContext.Provider>
      </Router>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('allows entering email and password', () => {
    render(
      <Router>
        <AuthContext.Provider value={mockAuthContextValue()}>
          <LoginPage />
        </AuthContext.Provider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
    expect(screen.getByLabelText(/password/i)).toHaveValue('password123');
  });

  it('calls login function on successful submission and shows success toast', async () => {
    mockLoginUser.mockResolvedValueOnce({ user: mockUser, tokens: mockTokens });
    const mockAuthContext = mockAuthContextValue();

    render(
      <Router>
        <AuthContext.Provider value={mockAuthContext}>
          <LoginPage />
        </AuthContext.Provider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
      expect(mockAuthContext.login).toHaveBeenCalledWith(mockUser, mockTokens);
      expect(mockToastSuccess).toHaveBeenCalledWith('Login successful!');
    });
  });

  it('shows error toast on failed login', async () => {
    const errorMessage = 'Incorrect email or password.';
    mockLoginUser.mockRejectedValueOnce({ response: { data: { message: errorMessage } } });
    const mockAuthContext = mockAuthContextValue();

    render(
      <Router>
        <AuthContext.Provider value={mockAuthContext}>
          <LoginPage />
        </AuthContext.Provider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLoginUser).toHaveBeenCalledTimes(1);
      expect(mockAuthContext.login).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith(errorMessage);
    });
  });

  it('disables button while loading', async () => {
    mockLoginUser.mockReturnValueOnce(new Promise(() => { })); // Never resolves
    const mockAuthContext = mockAuthContextValue();

    render(
      <Router>
        <AuthContext.Provider value={mockAuthContext}>
          <LoginPage />
        </AuthContext.Provider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByRole('button', { name: /logging in\.\.\./i })).toBeDisabled();

    // Cleanup: Restore mock to avoid unhandled promise rejection in console
    mockLoginUser.mockRestore();
  });
});
```