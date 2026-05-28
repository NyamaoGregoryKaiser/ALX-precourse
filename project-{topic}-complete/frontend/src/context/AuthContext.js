```javascript
import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios'; // Your Axios instance
import jwt_decode from 'jwt-decode'; // To decode JWT token (install 'jwt-decode')

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        token: localStorage.getItem('token'),
        isAuthenticated: false,
        user: null,
        loading: true,
    });

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Optionally verify token with backend or just decode locally
                    // Backend verification is more secure but adds latency
                    const decoded = jwt_decode(token);
                    if (decoded.exp * 1000 < Date.now()) { // Token expired
                        logout();
                        return;
                    }

                    // For production, you might want to hit a /profile endpoint to get fresh user data
                    // and verify token validity. For simplicity, we'll use decoded info.
                    setAuthState({
                        token,
                        isAuthenticated: true,
                        user: {
                            id: decoded.id, // Assuming 'id' is in JWT payload
                            // Add other user properties from decoded token or fetch from /profile
                            // e.g., username: decoded.username, role: decoded.role
                            role: decoded.role || 'user' // Default to user if not in token
                        },
                        loading: false,
                    });
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                } catch (error) {
                    console.error("Failed to decode token:", error);
                    logout();
                }
            } else {
                setAuthState(prev => ({ ...prev, loading: false }));
            }
        };

        loadUser();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', res.data.data.token);
            const decoded = jwt_decode(res.data.data.token);
            setAuthState({
                token: res.data.data.token,
                isAuthenticated: true,
                user: {
                    id: decoded.id,
                    username: res.data.data.user.username, // Get from API response
                    email: res.data.data.user.email,
                    role: res.data.data.user.role
                },
                loading: false,
            });
            api.defaults.headers.common['Authorization'] = `Bearer ${res.data.data.token}`;
            return res.data.data.user;
        } catch (error) {
            console.error('Login failed:', error.response?.data?.message || error.message);
            throw error;
        }
    };

    const register = async (username, email, password) => {
        try {
            const res = await api.post('/auth/register', { username, email, password });
            localStorage.setItem('token', res.data.data.token);
            const decoded = jwt_decode(res.data.data.token);
            setAuthState({
                token: res.data.data.token,
                isAuthenticated: true,
                user: {
                    id: decoded.id,
                    username: res.data.data.user.username,
                    email: res.data.data.user.email,
                    role: res.data.data.user.role
                },
                loading: false,
            });
            api.defaults.headers.common['Authorization'] = `Bearer ${res.data.data.token}`;
            return res.data.data.user;
        } catch (error) {
            console.error('Registration failed:', error.response?.data?.message || error.message);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setAuthState({
            token: null,
            isAuthenticated: false,
            user: null,
            loading: false,
        });
    };

    return (
        <AuthContext.Provider value={{ authState, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
```
*Note: `jwt-decode` is for client-side decoding *only* and does not verify the token's signature. For actual security, backend validation is paramount.*