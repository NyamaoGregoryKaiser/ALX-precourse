```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../src/components/Auth/Login';
import { AuthContext } from '../../src/context/AuthContext'; // Import AuthContext
import { useNavigate } from 'react-router-dom';

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('Login Component', () => {
  const mockLogin = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate); // Ensure mockNavigate is returned for each test
  });

  const renderComponent = (authContextValue = {}) => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={{ login: mockLogin, ...authContextValue }}>
          <Login />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  test('renders login form correctly', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('allows entering email and password', () => {
    renderComponent();
    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('calls login function and redirects on successful login', async () => {
    mockLogin.mockResolvedValueOnce({ username: 'testuser' }); // Simulate successful login

    renderComponent();
    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(screen.getByText('Login successful!')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/chat');
    });
  });

  test('displays error message on failed login', async () => {
    const errorMessage = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));

    renderComponent();
    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('wrong@example.com', 'wrongpassword');
    });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    expect(screen.queryByText('Login successful!')).not.toBeInTheDocument();
  });

  test('handles empty fields on submit', async () => {
    renderComponent();
    const loginButton = screen.getByRole('button', { name: /login/i });

    // Try to submit with empty fields. HTML5 validation usually prevents this,
    // but if it somehow passes, the mockLogin should not be called, or it will fail.
    // For React Testing Library, form submission with 'required' fields is generally handled by browser.
    // We can simulate an empty submission and expect error, or check if button is disabled until valid input.
    // Since inputs have `required`, form will not submit normally unless explicitly bypassed by RTL.
    // Let's check for validation messages if we were using a custom validation library.
    // For now, assume browser handles `required` for basic tests.
    fireEvent.click(loginButton);
    // If we had custom validation, we'd expect an error here. Without it, the form won't submit.
    expect(mockLogin).not.toHaveBeenCalled(); // The HTML5 `required` attribute prevents submission.
  });
});
```