import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import AuthPage from '../../pages/Auth';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

// Mock the API service
jest.mock('../../services/api');

// Mock useNavigate
const mockedUsedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedUsedNavigate,
}));

describe('AuthPage (Login)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders login form correctly', () => {
    render(
      <Router>
        <AuthProvider>
          <AuthPage type="login" />
        </AuthProvider>
      </Router>
    );

    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account?/i)).toBeInTheDocument();
  });

  test('successfully logs in a user and redirects to dashboard', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        user: { id: '1', username: 'testuser' },
        tokens: { token: 'mock_token' },
      },
    });

    render(
      <Router>
        <AuthProvider>
          <AuthPage type="login" />
        </AuthProvider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
      expect(localStorage.getItem('token')).toBe('mock_token');
      expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: '1', username: 'testuser' }));
      expect(mockedUsedNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('displays error message on failed login', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });

    render(
      <Router>
        <AuthProvider>
          <AuthPage type="login" />
        </AuthProvider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: 'wronguser' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });
});

describe('AuthPage (Register)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders registration form correctly', () => {
    render(
      <Router>
        <AuthProvider>
          <AuthPage type="register" />
        </AuthProvider>
      </Router>
    );

    expect(screen.getByRole('heading', { name: /Register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account?/i)).toBeInTheDocument();
  });

  test('successfully registers a user and redirects to dashboard', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        user: { id: '2', username: 'newuser', email: 'new@example.com' },
        tokens: { token: 'new_mock_token' },
      },
    });

    render(
      <Router>
        <AuthProvider>
          <AuthPage type="register" />
        </AuthProvider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: 'newuser' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        email: 'new@example.com',
        password: 'newpassword123',
      });
      expect(localStorage.getItem('token')).toBe('new_mock_token');
      expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: '2', username: 'newuser', email: 'new@example.com' }));
      expect(mockedUsedNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('displays error message on failed registration', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Username already taken' } },
    });

    render(
      <Router>
        <AuthProvider>
          <AuthPage type="register" />
        </AuthProvider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: 'takenuser' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'taken@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(screen.getByText(/Username already taken/i)).toBeInTheDocument();
    });
  });
});