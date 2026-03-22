```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext'; // Directly import the mockable hook

// Mock the useAuth hook to control its return values for different test scenarios
jest.mock('../contexts/AuthContext');

describe('Navbar Component', () => {
  beforeEach(() => {
    // Clear mock calls and reset implementation before each test
    useAuth.mockReset();
  });

  it('renders correctly for an unauthenticated user', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      logout: jest.fn(),
    });

    render(
      <Router>
        <Navbar />
      </Router>
    );

    expect(screen.getByText('Product Catalog')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage Products')).not.toBeInTheDocument();
  });

  it('renders correctly for an authenticated regular user', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { email: 'user@example.com', role: 'user' },
      logout: jest.fn(),
    });

    render(
      <Router>
        <Navbar />
      </Router>
    );

    expect(screen.getByText('Product Catalog')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByText('Welcome, user@example.com (user)')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Register')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage Products')).not.toBeInTheDocument();
  });

  it('renders correctly for an authenticated admin user', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { email: 'admin@example.com', role: 'admin' },
      logout: jest.fn(),
    });

    render(
      <Router>
        <Navbar />
      </Router>
    );

    expect(screen.getByText('Product Catalog')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Manage Products')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.getByText('Welcome, admin@example.com (admin)')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Register')).not.toBeInTheDocument();
  });

  it('calls logout function when Logout button is clicked', () => {
    const mockLogout = jest.fn();
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { email: 'user@example.com', role: 'user' },
      logout: mockLogout,
    });

    render(
      <Router>
        <Navbar />
      </Router>
    );

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
```