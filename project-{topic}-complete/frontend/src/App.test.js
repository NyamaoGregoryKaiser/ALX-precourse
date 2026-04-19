import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import * as authApi from './api/auth';
import '@testing-library/jest-dom';

// Mock the auth API calls
jest.mock('./api/auth', () => ({
  checkAuth: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
}));

// Mock components that might make real API calls or have complex logic
jest.mock('./pages/DashboardPage', () => () => <div>Dashboard Page</div>);
jest.mock('./pages/LoginPage', () => () => <div>Login Page</div>);
jest.mock('./pages/RegisterPage', () => () => <div>Register Page</div>);
jest.mock('./pages/ProjectsPage', () => () => <div>Projects Page</div>);
jest.mock('./pages/TasksPage', () => () => <div>Tasks Page</div>);
jest.mock('./pages/NotFoundPage', () => () => <div>Not Found Page</div>);

describe('App Component (Routing & Auth Integration)', () => {
  beforeEach(() => {
    // Reset mocks before each test
    authApi.checkAuth.mockClear();
  });

  it('renders Login page by default if not authenticated', async () => {
    authApi.checkAuth.mockResolvedValueOnce({ isAuthenticated: false, user: null });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    expect(authApi.checkAuth).toHaveBeenCalledTimes(1);
  });

  it('renders Dashboard page if authenticated and navigates to root', async () => {
    authApi.checkAuth.mockResolvedValueOnce({
      isAuthenticated: true,
      user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' }
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
    expect(authApi.checkAuth).toHaveBeenCalledTimes(1);
  });

  it('renders Projects page for authenticated user', async () => {
    authApi.checkAuth.mockResolvedValueOnce({
      isAuthenticated: true,
      user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' }
    });

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Projects Page')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated user from protected route to login', async () => {
    authApi.checkAuth.mockResolvedValueOnce({ isAuthenticated: false, user: null });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('renders Not Found page for unknown route', async () => {
    authApi.checkAuth.mockResolvedValueOnce({
      isAuthenticated: true, // Doesn't matter for 404
      user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' }
    });

    render(
      <MemoryRouter initialEntries={['/non-existent-route']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Not Found Page')).toBeInTheDocument();
    });
  });
});