```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthForm from './AuthForm';
import { AuthContext } from '../context/AuthContext';
import { BrowserRouter as Router } from 'react-router-dom';
import { toast } from 'react-toastify';

// Mock the useAuth hook
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockUseAuth = {
  user: null,
  isAuthenticated: false,
  login: mockLogin,
  register: mockRegister,
  logout: jest.fn(),
  loading: false,
};

// Mock toast notifications
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AuthForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderAuthForm = (type: 'login' | 'register') => {
    return render(
      <Router>
        <AuthContext.Provider value={mockUseAuth}>
          <AuthForm type={type} />
        </AuthContext.Provider>
      </Router>
    );
  };

  it('renders login form correctly', () => {
    renderAuthForm('login');
    expect(screen.getByRole('heading', { name: /login to sqlinsight pro/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account?/i)).toBeInTheDocument();
  });

  it('renders register form correctly', () => {
    renderAuthForm('register');
    expect(screen.getByRole('heading', { name: /register for sqlinsight pro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account?/i)).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    mockLogin.mockResolvedValueOnce(undefined); // Login resolves successfully

    renderAuthForm('login');

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });
    // Navigation is handled by AuthContext, so we don't assert it here directly.
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('handles failed login and displays error', async () => {
    const errorMessage = 'Invalid credentials.';
    mockLogin.mockRejectedValueOnce({ response: { data: { message: errorMessage } } });

    renderAuthForm('login');

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    expect(toast.error).toHaveBeenCalledWith(errorMessage);
  });

  it('disables button when loading', () => {
    mockUseAuth.loading = true; // Set loading state for this test
    renderAuthForm('login');
    expect(screen.getByRole('button', { name: /loading.../i })).toBeDisabled();
    mockUseAuth.loading = false; // Reset for other tests
  });
});
```

### API Tests (Postman/Insomnia Collection - conceptual description)

A comprehensive API test suite would involve:
*   **Authentication Flow:** Register -> Login -> Get Profile (with token) -> Logout.
*   **Authorization Checks:** Test admin-only endpoints with a regular user token to ensure 403. Test user-owned resource access.
*   **CRUD for Users (Admin):** Create, Read, Update, Delete users.
*   **CRUD for Databases:** Create, Read (all/single), Update, Delete databases. Verify ownership.
*   **CRUD for Slow Queries:** Report a query, Get all (with filters), Get single (with plans/suggestions), Update suggestion status.
*   **Validation Testing:** Send invalid data to endpoints to ensure 400 Bad Request.
*   **Error Handling:** Test non-existent routes (404), internal server errors (500).

This would typically be a collection of requests that can be imported into tools like Postman or Insomnia, or codified using libraries like Supertest for automated E2E tests.

### Performance Tests (Conceptual using Artillery)

Artillery is a popular tool for load testing. Here's a conceptual `artillery.yml` to simulate traffic on the SQLInsight Pro backend.

#### `artillery.yml` (Conceptual)