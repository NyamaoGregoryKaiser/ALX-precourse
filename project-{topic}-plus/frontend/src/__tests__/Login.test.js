import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import * as AuthApi from '../api/auth';

// Mock the useAuth hook to control authentication state for tests
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: jest.fn(),
}));

// Mock the auth API calls
jest.mock('../api/auth');

describe('LoginPage', () => {
  const mockLogin = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    mockLogin.mockReset();
    mockNavigate.mockReset();

    // Default mock implementation for useAuth
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      user: null,
      login: mockLogin,
      register: jest.fn(),
      logout: jest.fn(),
      loadUser: jest.fn(),
    });

    // Mock BrowserRouter's navigate function
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));
  });

  const renderLoginPage = () =>
    render(
      <BrowserRouter>
        <AuthProvider> {/* Even if useAuth is mocked, AuthProvider might be needed for context setup */}
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

  test('renders login form correctly', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  test('shows error message for empty fields on submit', async () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeInvalid();
      expect(screen.getByLabelText(/password/i)).toBeInvalid();
    });
  });

  test('calls login function with correct credentials on successful submit', async () => {
    mockLogin.mockResolvedValue(true); // Simulate successful login

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
    });
  });

  test('displays error message on failed login', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValue(errorMessage); // Simulate failed login

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  test('disables form fields and button during login process', async () => {
    // Simulate loading state
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolve to keep loading

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /logging in.../i })).toBeDisabled();
    });
  });
});