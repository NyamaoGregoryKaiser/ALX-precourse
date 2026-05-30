import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import CreateAccount from './components/Accounts/CreateAccount';
import AccountDetail from './components/Accounts/AccountDetail';
import InitiateTransaction from './components/Transactions/InitiateTransaction';
import Navbar from './components/Layout/Navbar';

function App() {
  const [token, setToken] = useState(localStorage.getItem('jwtToken'));
  const [user, setUser] = useState(null);

  const handleLogin = (jwtToken, userData) => {
    localStorage.setItem('jwtToken', jwtToken);
    setToken(jwtToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    setToken(null);
    setUser(null);
  };

  // Fetch user profile on app load if token exists
  useEffect(() => {
    const fetchProfile = async () => {
      if (token) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          } else {
            handleLogout(); // Token might be expired or invalid
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          handleLogout();
        }
      }
    };
    fetchProfile();
  }, [token]);

  return (
    <Router>
      <Navbar user={user} onLogout={handleLogout} />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
          <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <Register onRegister={handleLogin} />} />
          <Route
            path="/dashboard"
            element={token ? <Dashboard user={user} token={token} /> : <Navigate to="/login" />}
          />
          <Route
            path="/accounts/create"
            element={token ? <CreateAccount token={token} /> : <Navigate to="/login" />}
          />
          <Route
            path="/accounts/:accountId"
            element={token ? <AccountDetail token={token} /> : <Navigate to="/login" />}
          />
          <Route
            path="/transactions/initiate/:accountId?"
            element={token ? <InitiateTransaction token={token} /> : <Navigate to="/login" />}
          />
          <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;