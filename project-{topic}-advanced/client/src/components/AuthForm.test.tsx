```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthForm } from './AuthForm';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext
import { BrowserRouter as Router } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// Mock the AuthContext values
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockAuthContextValue = {
  user: null,
  token: null,
  login: mockLogin,
  logout: jest.fn(),
  register: mockRegister,
  isAuthenticated: false,
  isLoading: false,
};

const renderWithContext = (ui: React.ReactElement, { type }: { type: 'login' | 'register' }) => {
  return render(
    <Router>
      <AuthContext.Provider value={mockAuthContextValue}>
        {ui}
      </AuthContext.Provider>
    </Router>
  );
};

describe('AuthForm', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockLogin.mockClear();
    mockRegister.mockClear();
  });

  it('renders login form correctly', () => {
    renderWithContext(<AuthForm type="login" />, { type: 'login' });
    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/First Name/i)).not.toBeInTheDocument();
  });

  it('renders register form correctly', () => {
    renderWithContext(<AuthForm type="register" />, { type: 'register' });
    expect(screen.getByRole('heading', { name: /Register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
  });

  it('handles login submission successfully', async () => {
    renderWithContext(<AuthForm type="login" />, { type: 'login' });

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    // Check for success message or redirection (depending on implementation)
    // For this example, we just check if login was called.
    // If there was a success message in AuthForm, you'd assert it here.
  });

  it('handles login submission with error', async () => {
    // Mock a failed login response
    server.use(
      http.post('*/api/v1/auth/login', () => {
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      })
    );

    renderWithContext(<AuthForm type="login" />, { type: 'login' });

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1); // Still called the context's login
    });

    // Check for error message display
    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
  });

  it('handles registration submission successfully', async () => {
    renderWithContext(<AuthForm type="register" />, { type: 'register' });

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'newpassword123' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'User' } });
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpassword123',
        firstName: 'New',
        lastName: 'User',
      });
    });
  });
});
```