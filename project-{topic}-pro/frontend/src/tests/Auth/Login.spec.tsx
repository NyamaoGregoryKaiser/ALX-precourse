```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Login from '../../pages/Auth/Login';
import { AuthProvider } from '../../context/AuthContext';
import axiosInstance from '../../api/axiosInstance';
import { act } from 'react-dom/test-utils';

// Mock axiosInstance
jest.mock('../../api/axiosInstance');
const mockedAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>;

// Mock react-router-dom useNavigate
const mockedUsedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockedUsedNavigate,
}));

describe('Login Component', () => {
    beforeEach(() => {
        // Clear mocks before each test
        mockedAxiosInstance.post.mockReset();
        mockedUsedNavigate.mockReset();
        // Clear localStorage
        localStorage.clear();
    });

    it('renders login form correctly', () => {
        render(
            <Router>
                <AuthProvider>
                    <Login />
                </AuthProvider>
            </Router>
        );

        expect(screen.getByText(/login to your account/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
        expect(screen.getByText(/don't have an account\? register/i)).toBeInTheDocument();
    });

    it('handles successful login', async () => {
        mockedAxiosInstance.post.mockResolvedValue({
            data: {
                token: 'mock-token',
                user: { id: '1', email: 'test@example.com', role: 'user' },
            },
        });

        render(
            <Router>
                <AuthProvider>
                    <Login />
                </AuthProvider>
            </Router>
        );

        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(mockedAxiosInstance.post).toHaveBeenCalledWith('/auth/login', {
                email: 'test@example.com',
                password: 'password123',
            });
            expect(localStorage.getItem('token')).toBe('mock-token');
            expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: '1', email: 'test@example.com', role: 'user' }));
            expect(mockedUsedNavigate).toHaveBeenCalledWith('/dashboards');
        });
    });

    it('displays error message on failed login', async () => {
        const errorMessage = 'Invalid credentials.';
        mockedAxiosInstance.post.mockRejectedValue({
            response: { data: { message: errorMessage } },
        });

        render(
            <Router>
                <AuthProvider>
                    <Login />
                </AuthProvider>
            </Router>
        );

        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
            expect(localStorage.getItem('token')).toBeNull();
            expect(mockedUsedNavigate).not.toHaveBeenCalled();
        });
    });

    it('shows loading state during login', async () => {
        mockedAxiosInstance.post.mockReturnValue(new Promise(() => {})); // Never resolves

        render(
            <Router>
                <AuthProvider>
                    <Login />
                </AuthProvider>
            </Router>
        );

        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        expect(screen.getByRole('button', { name: /logging in.../i })).toBeInTheDocument();
    });

    it('redirects to dashboards if already authenticated', async () => {
        // Mock a user already in localStorage
        localStorage.setItem('token', 'existing-token');
        localStorage.setItem('user', JSON.stringify({ id: '1', email: 'logged@example.com', role: 'user' }));

        render(
            <Router>
                <AuthProvider>
                    <Login />
                </AuthProvider>
            </Router>
        );

        await waitFor(() => {
            expect(mockedUsedNavigate).toHaveBeenCalledWith('/dashboards', { replace: true });
        });
    });
});
```