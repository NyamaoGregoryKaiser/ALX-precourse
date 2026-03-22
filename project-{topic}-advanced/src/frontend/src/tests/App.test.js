```javascript
import { render, screen } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { BrowserRouter as Router } from 'react-router-dom';

// Mock the AuthContext to control authentication state for tests
jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'), // Import and retain default behavior
  useAuth: jest.fn(), // Mock useAuth hook
}));

describe('App Component', () => {
  beforeEach(() => {
    // Reset the mock before each test
    jest.clearAllMocks();
  });

  it('renders Navbar', () => {
    require('../contexts/AuthContext').useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
    });
    render(
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    );
    const navbarElement = screen.getByText(/Product Catalog/i);
    expect(navbarElement).toBeInTheDocument();
  });

  it('renders HomePage for unauthenticated user on /', () => {
    require('../contexts/AuthContext').useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
    });
    render(
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    );
    expect(screen.getByText(/Welcome to the Product Catalog!/i)).toBeInTheDocument();
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
  });

  it('renders ProductsPage for authenticated user on /products', () => {
    require('../contexts/AuthContext').useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'user@example.com', role: 'user' },
      login: jest.fn(),
      logout: jest.fn(),
    });

    window.history.pushState({}, 'Test page', '/products');
    render(
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    );

    // ProductsPage typically displays a heading like "Product Catalog" or fetches products
    // Since fetchProducts is async, we can check for a loading state or the main heading
    expect(screen.getByText(/Product Catalog/i)).toBeInTheDocument();
    expect(screen.getByText(/Loading products.../i)).toBeInTheDocument(); // Initial loading state
  });

  it('redirects unauthenticated user from /products to /login', () => {
    require('../contexts/AuthContext').useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    window.history.pushState({}, 'Test page', '/products');
    render(
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    );

    // After redirection, it should show login page content
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('renders ManageProductsPage for admin user on /admin/products', () => {
    require('../contexts/AuthContext').useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
      login: jest.fn(),
      logout: jest.fn(),
    });

    window.history.pushState({}, 'Test page', '/admin/products');
    render(
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    );

    expect(screen.getByText(/Manage Products/i)).toBeInTheDocument();
    expect(screen.getByText(/Loading products for management.../i)).toBeInTheDocument(); // Initial loading state
  });

  it('redirects non-admin user from /admin/products to /', () => {
    require('../contexts/AuthContext').useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'regular@example.com', role: 'user' },
      login: jest.fn(),
      logout: jest.fn(),
    });

    window.history.pushState({}, 'Test page', '/admin/products');
    render(
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    );

    // Should redirect to homepage and show access denied message (if message is rendered)
    expect(screen.getByText(/Welcome to the Product Catalog!/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });
});
```