```typescript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';

const Login: React.FC = () => {
    useAuthRedirect('/dashboards', false); // Redirect to dashboards if already logged in

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.post('/auth/login', { email, password });
            login(response.data.token, response.data.user);
            navigate('/dashboards');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg">
                <h3 className="text-2xl font-bold text-center">Login to your account</h3>
                {error && <div className="text-red-500 text-sm mt-2 text-center">{error}</div>}
                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="mt-4">
                        <label className="block" htmlFor="email">Email</label>
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mt-4">
                        <label className="block" htmlFor="password">Password</label>
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-baseline justify-between mt-4">
                        <button
                            type="submit"
                            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-900"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                        <Link to="/register" className="text-sm text-blue-600 hover:underline">Don't have an account? Register</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
```