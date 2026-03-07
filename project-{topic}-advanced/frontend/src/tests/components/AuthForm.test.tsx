```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import AuthForm from '../../components/AuthForm';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Mock the AuthContext values
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  fetchUser: jest.fn(),
};

describe('AuthForm', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue(mockAuthContext);
    mockAuthContext.login.mockClear();
    mockAuthContext.register.mockClear();
    mockNavigate.mockClear();
  });

  // Helper function to render AuthForm within Router
  const renderAuthForm = (type: 'login' | 'register') => {
    return render(
      <Router>
        <AuthProvider>
          <AuthForm type={type} />
        </AuthProvider>
      </Router>
    );
  };

  describe('Login Form', () => {
    it('renders login form correctly', () => {
      renderAuthForm('login');
      expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Email or Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByText(/Don't have an account?/i)).toBeInTheDocument();
    });

    it('handles successful login', async () => {
      mockAuthContext.login.mockResolvedValueOnce({});

      renderAuthForm('login');

      fireEvent.change(screen.getByLabelText(/Email or Username/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(mockAuthContext.login).toHaveBeenCalledWith({ emailOrUsername: 'test@example.com', password: 'password123' });
      });
      // Navigation is handled internally by AuthContext, so we don't assert mockNavigate here.
      // But we can assert the loading state is no longer present.
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('displays error message on failed login', async () => {
      mockAuthContext.login.mockRejectedValueOnce({ response: { data: { message: 'Invalid credentials' } } });

      renderAuthForm('login');

      fireEvent.change(screen.getByLabelText(/Email or Username/i), { target: { value: 'wrong@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Register Form', () => {
    it('renders register form correctly', () => {
      renderAuthForm('register');
      expect(screen.getByRole('heading', { name: /Register/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
      expect(screen.getByText(/Already have an account?/i)).toBeInTheDocument();
    });

    it('handles successful registration', async () => {
      mockAuthContext.register.mockResolvedValueOnce({});

      renderAuthForm('register');

      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'newuser' } });
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'newpassword' } });
      fireEvent.click(screen.getByRole('button', { name: /Register/i }));

      await waitFor(() => {
        expect(mockAuthContext.register).toHaveBeenCalledWith({ username: 'newuser', email: 'new@example.com', password: 'newpassword' });
      });
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('displays error message on failed registration', async () => {
      mockAuthContext.register.mockRejectedValueOnce({ response: { data: { message: 'User already exists' } } });

      renderAuthForm('register');

      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'dupuser' } });
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'dup@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
      fireEvent.click(screen.getByRole('button', { name: /Register/i }));

      await waitFor(() => {
        expect(screen.getByText(/User already exists/i)).toBeInTheDocument();
      });
    });
  });

  it('navigates to register page when "Register" button is clicked in login form', () => {
    renderAuthForm('login');
    fireEvent.click(screen.getByText(/Register/i));
    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('navigates to login page when "Login" button is clicked in register form', () => {
    renderAuthForm('register');
    fireEvent.click(screen.getByText(/Login/i));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
```