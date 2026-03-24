```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import Login from './Login';
import { AuthContext } from '../../context/AuthContext'; // Import AuthContext
import { authService } from '../../services/auth.service'; // Import authService mock
import { LoginData } from '../../types';

// Mock the useAuth hook and authService
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: jest.fn(),
    isAuthenticated: false,
    user: null,
    logout: jest.fn(),
  }),
}));

jest.mock('../../services/auth.service', () => ({
  authService: {
    login: jest.fn(),
  },
}));

// Mock useNavigate from react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login Component', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    mockLogin.mockClear();
    (authService.login as jest.Mock).mockClear();
    mockNavigate.mockClear();
  });

  // Helper to render Login component with AuthProvider
  const renderWithAuthProvider = (ui: React.ReactElement, authContextValue?: Partial<AuthContextType>) => {
    const defaultAuthContext: AuthContextType = {
      user: null,
      isAuthenticated: false,
      login: mockLogin,
      register: jest.fn(),
      logout: jest.fn(),
    };
    return render(
      <Router>
        <AuthContext.Provider value={{ ...defaultAuthContext, ...authContextValue }}>
          {ui}
        </AuthContext.Provider>
      </Router>
    );
  };

  it('renders login form correctly', () => {
    renderWithAuthProvider(<Login />);

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account?/i)).toBeInTheDocument();
  });

  it('allows user to type in email and password fields', () => {
    renderWithAuthProvider(<Login />);

    const emailInput = screen.getByLabelText(/Email:/i);
    const passwordInput = screen.getByLabelText(/Password:/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls login function on form submission with correct data', async () => {
    renderWithAuthProvider(<Login />);

    const emailInput = screen.getByLabelText(/Email:/i);
    const passwordInput = screen.getByLabelText(/Password:/i);
    const signInButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('redirects to dashboard on successful login', async () => {
    mockLogin.mockResolvedValueOnce(undefined); // Simulate successful login

    renderWithAuthProvider(<Login />);

    const emailInput = screen.getByLabelText(/Email:/i);
    const passwordInput = screen.getByLabelText(/Password:/i);
    const signInButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message on failed login', async () => {
    const errorMessage = 'Invalid credentials.';
    mockLogin.mockRejectedValueOnce({ response: { data: { message: errorMessage } } }); // Simulate failed login

    renderWithAuthProvider(<Login />);

    const emailInput = screen.getByLabelText(/Email:/i);
    const passwordInput = screen.getByLabelText(/Password:/i);
    const signInButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
```