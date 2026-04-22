```typescript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-gray-800 p-4 text-white">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold">DataVizApp</Link>
                <div>
                    {isAuthenticated ? (
                        <ul className="flex space-x-4">
                            <li>Welcome, {user?.email} ({user?.role})</li>
                            <li><Link to="/dashboards" className="hover:text-gray-300">Dashboards</Link></li>
                            <li><Link to="/data-sources" className="hover:text-gray-300">Data Sources</Link></li>
                            <li><button onClick={handleLogout} className="hover:text-gray-300">Logout</button></li>
                        </ul>
                    ) : (
                        <ul className="flex space-x-4">
                            <li><Link to="/login" className="hover:text-gray-300">Login</Link></li>
                            <li><Link to="/register" className="hover:text-gray-300">Register</Link></li>
                        </ul>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
```