import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './hooks/useAuth'; // Assuming AuthProvider exists

// Mock necessary components/API calls if they are direct children
jest.mock('./pages/Home', () => () => <div>Home Page</div>);
jest.mock('./pages/Login', () => () => <div>Login Page</div>);
jest.mock('./pages/Register', () => () => <div>Register Page</div>);
jest.mock('./pages/Dashboards', () => () => <div>Dashboards List</div>);
jest.mock('./pages/DataSources', () => () => <div>Data Sources List</div>);

describe('App Routing', () => {
  it('renders Home page on default route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders Login page on /login route', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders Register page on /register route', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Register Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users from protected routes (e.g., /dashboards)', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboards']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    // Assuming unauthenticated redirects to login
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  // Additional tests would involve mocking authentication state
  // to test access to protected routes.
  it('renders Dashboards list for authenticated users', () => {
    // Mock authenticated state
    jest.spyOn(require('./hooks/useAuth'), 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', username: 'test' },
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboards']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Dashboards List')).toBeInTheDocument();
  });
});