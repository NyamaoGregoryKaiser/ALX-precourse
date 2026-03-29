```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPage from '../pages/Auth';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the API calls
jest.mock('../api/api');
const mockApiPost = api.post as jest.Mock;

// Mock the AuthContext useAuth hook
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: jest.fn(),
}));
const mockUseAuth = useAuth as jest.Mock;

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      login: mockLogin,
      logout: jest.fn(),
    });
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);
  });

  // --- Login Mode Tests ---
  describe('Login Mode', () => {
    it('should render login form by default', () => {
      render(
        <BrowserRouter>
          <AuthPage />
        </BrowserRouter>
      );
      expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
      expect(screen.getByText(/Don't have an account?/i)).toBeInTheDocument();
    });

    it('should allow user to type in email and password fields', () => {
      render(
        <BrowserRouter>
          <AuthPage />
        </BrowserRouter>
      );
      const emailInput = screen.getByLabelText(/Email:/i);
      const passwordInput = screen.getByLabelText(/Password:/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should call login API and navigate on successful login', async () => {
      mockApiPost.mockResolvedValueOnce({ data: { token: 'mock-jwt-token', role: 'user' } });

      render(
        <BrowserRouter>
          <AuthPage />
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email:/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password:/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Login/i }));

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'password123',
        });
        expect(mockLogin).toHaveBeenCalledWith('mock-jwt-token', 'user');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should display error message on failed login', async () => {
      mockApiPost.mockRejectedValueOnce({ response: { data: { message: 'Invalid credentials' } } });

      render(
        <BrowserRouter>
          <AuthPage />
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email:/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password:/i), { target: { value: 'wrongpass' } });
      fireEvent.click(screen.getByRole('button', { name: /Login/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
      });
      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should disable button while loading', async () => {
      mockApiPost.mockReturnValue(new Promise(() => { })); // Never resolve

      render(
        <BrowserRouter>
          <AuthPage />
        </BrowserRouter>
      );

      const loginButton = screen.getByRole('button', { name: /Login/i });
      fireEvent.click(loginButton);

      expect(loginButton).toBeDisabled();
      await waitFor(() => {
        // Since it never resolves, the button should stay disabled.
        // We can check this by expecting the button to still be disabled after a short wait.
        expect(loginButton).toBeDisabled();
      }, { timeout: 100 }); // Small timeout just to allow microtasks to run if any
    });
  });

  // --- Register Mode Tests ---
  describe('Register Mode', () => {
    it('should render register form when registerMode is true', () => {
      render(
        <BrowserRouter>
          <AuthPage registerMode />
        </BrowserRouter>
      );
      expect(screen.getByRole('heading', { name: /Register/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
      expect(screen.getByText(/Already have an account?/i)).toBeInTheDocument();
    });

    it('should call register API and navigate to login on successful registration', async () => {
      mockApiPost.mockResolvedValueOnce({ data: { message: 'User registered successfully' } });
      jest.spyOn(window, 'alert').mockImplementation(() => { }); // Mock alert

      render(
        <BrowserRouter>
          <AuthPage registerMode />
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email:/i), { target: { value: 'newuser@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password:/i), { target: { value: 'newpassword123' } });
      fireEvent.click(screen.getByRole('button', { name: /Register/i }));

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith('/auth/register', {
          email: 'newuser@example.com',
          password: 'newpassword123',
        });
        expect(window.alert).toHaveBeenCalledWith('Registration successful! Please log in.');
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should display error message on failed registration', async () => {
      mockApiPost.mockRejectedValueOnce({ response: { data: { message: 'User with this email already exists' } } });

      render(
        <BrowserRouter>
          <AuthPage registerMode />
        </BrowserRouter>
      );

      fireEvent.change(screen.getByLabelText(/Email:/i), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password:/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Register/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('User with this email already exists');
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
```