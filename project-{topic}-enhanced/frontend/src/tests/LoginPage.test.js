```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import api from '../api/api';

// Mock the API service
jest.mock('../api/api');
// Mock react-router-dom useNavigate
const mockedUsedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedUsedNavigate,
}));

// Create a mock AuthProvider context for testing
const MockAuthProvider = ({ children, mockAuthContext }) => (
  <AuthContext.Provider value={mockAuthContext}>
    {children}
  </AuthContext.Provider>
);

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    const mockAuthContext = { isAuthenticated: false, login: jest.fn() };
    render(
      <Router>
        <MockAuthProvider mockAuthContext={mockAuthContext}>
          <LoginPage />
        </MockAuthProvider>
      </Router>
    );

    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('handles successful login and redirects to dashboard', async () => {
    const mockLogin = jest.fn(() => Promise.resolve({ user: { username: 'test' } }));
    const mockAuthContext = { isAuthenticated: false, login: mockLogin };

    render(
      <Router>
        <MockAuthProvider mockAuthContext={mockAuthContext}>
          <LoginPage />
        </MockAuthProvider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockedUsedNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message on failed login', async () => {
    const errorMessage = 'Invalid credentials';
    const mockLogin = jest.fn(() =>
      Promise.reject({ response: { data: { message: errorMessage } } })
    );
    const mockAuthContext = { isAuthenticated: false, login: mockLogin };

    render(
      <Router>
        <MockAuthProvider mockAuthContext={mockAuthContext}>
          <LoginPage />
        </MockAuthProvider>
      </Router>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
```