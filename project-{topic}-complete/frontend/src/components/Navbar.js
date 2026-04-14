```javascript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ isAuthenticated, onLogout }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/auth');
    };

    return (
        <nav className="bg-gray-800 p-4 text-white">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold">Scraping Tool</Link>
                <div>
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" className="mr-4 hover:text-gray-300">Dashboard</Link>
                            <button onClick={handleLogout} className="bg-red-500 px-3 py-2 rounded hover:bg-red-600">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/auth" className="bg-blue-500 px-3 py-2 rounded hover:bg-blue-600">Login / Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
```