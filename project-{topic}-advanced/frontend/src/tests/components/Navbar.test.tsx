import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock the useAuth hook to control authentication state
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;

describe('Navbar Component', () => {
  const mockOnMenuClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      logout: jest.fn(),
    });
  });

  it('renders login and register links when not authenticated', () => {
    render(
      <Router>
        <Navbar onMenuClick={mockOnMenuClick} />
      </Router>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.queryByText('Dashboards')).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('renders authenticated links and user info when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'user' },
      logout: jest.fn(),
    });

    render(
      <Router>
        <Navbar onMenuClick={mockOnMenuClick} />
      </Router>
    );

    expect(screen.getByText('Dashboards')).toBeInTheDocument();
    expect(screen.getByText('Data Sources')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Hello, testuser (user)')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  it('calls logout function when Logout button is clicked', () => {
    const mockLogout = jest.fn();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'user' },
      logout: mockLogout,
    });

    render(
      <Router>
        <Navbar onMenuClick={mockOnMenuClick} />
      </Router>
    );

    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('calls onMenuClick when menu button is clicked (if authenticated)', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { username: 'testuser', role: 'user' },
      logout: jest.fn(),
    });

    render(
      <Router>
        <Navbar onMenuClick={mockOnMenuClick} />
      </Router>
    );

    // The menu button is usually hidden on desktop,
    // but in a test environment, we assume it's there
    // We might need to make it visible or adjust styling for testing purposes
    // Here, we'll try to find it by text '☰'
    const menuButton = screen.getByText('☰');
    fireEvent.click(menuButton);
    expect(mockOnMenuClick).toHaveBeenCalledTimes(1);
  });
});