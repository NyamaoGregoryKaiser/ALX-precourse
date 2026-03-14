import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import LoginForm from './LoginForm';
import { AuthContext } from '../../contexts/AuthContext';
import theme from '../../styles/theme';

// Mock the AuthContext values
const mockLogin = jest.fn();
const mockAuthContextValue = {
  isAuthenticated: false,
  isLoading: false,
  login: mockLogin,
  logout: jest.fn(),
  register: jest.fn(),
  user: null,
};

const renderWithContext = (ui: React.ReactElement, { providerProps, ...renderOptions }: any = {}) => {
  return render(
    <ChakraProvider theme={theme}>
      <Router>
        <AuthContext.Provider value={{ ...mockAuthContextValue, ...providerProps }}>
          {ui}
        </AuthContext.Provider>
      </Router>
    </ChakraProvider>,
    renderOptions
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    mockLogin.mockClear();
  });

  it('renders email and password fields, and a submit button', () => {
    renderWithContext(<LoginForm />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('updates email and password fields on user input', () => {
    renderWithContext(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('calls the login function with correct data on submit', async () => {
    renderWithContext(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays an error message if login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials')); // Simulate login failure
    renderWithContext(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('shows a loading spinner when login is in progress', async () => {
    // Simulate login taking time
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderWithContext(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/signing in.../i)).toBeInTheDocument(); // Button text changes
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
  });
});