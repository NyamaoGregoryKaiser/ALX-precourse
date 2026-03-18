```jsx
import React, { useState, useEffect } from 'react';
import './App.css'; // Basic CSS for the app

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [datasources, setDatasources] = useState([]);
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboardData, setSelectedDashboardData] = useState({});
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserMe(token);
      fetchDatasources(token);
      fetchDashboards(token);
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setDatasources([]);
      setDashboards([]);
      setSelectedDashboardData({});
    }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/access-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ username: email, password: password }),
      });
      const data = await response.json();
      if (response.ok) {
        setToken(data.access_token);
        setMessage('Login successful!');
      } else {
        setMessage(data.detail || 'Login failed.');
      }
    } catch (error) {
      setMessage('Network error during login.');
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => {
    setToken('');
    setMessage('Logged out successfully.');
  };

  const fetchUserMe = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data);
      } else {
        setMessage(data.detail || 'Failed to fetch user data.');
        if (response.status === 401) setToken(''); // Token expired or invalid
      }
    } catch (error) {
      setMessage('Network error during user data fetch.');
      console.error('Fetch user error:', error);
    }
  };

  const fetchDatasources = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/datasources`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setDatasources(data);
      } else {
        setMessage(data.detail || 'Failed to fetch data sources.');
      }
    } catch (error) {
      setMessage('Network error during data source fetch.');
      console.error('Fetch datasources error:', error);
    }
  };

  const fetchDashboards = async (authToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboards`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setDashboards(data);
      } else {
        setMessage(data.detail || 'Failed to fetch dashboards.');
      }
    } catch (error) {
      setMessage('Network error during dashboards fetch.');
      console.error('Fetch dashboards error:', error);
    }
  };

  const fetchDashboardData = async (dashboardId) => {
    setLoadingDashboard(true);
    setSelectedDashboardData({});
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/dashboards/${dashboardId}/data`, {
        method: 'POST', // This endpoint is a POST to allow for complex parameter passing in a real app
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty body for now
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedDashboardData(data);
        setMessage(`Loaded data for dashboard ${dashboardId}`);
      } else {
        setMessage(data.detail || 'Failed to fetch dashboard data.');
      }
    } catch (error) {
      setMessage('Network error during dashboard data fetch.');
      console.error('Fetch dashboard data error:', error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Data Visualization System</h1>
        {message && <p className="message">{message}</p>}
      </header>

      {!token ? (
        <div className="auth-section">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <div>
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      ) : (
        <div className="dashboard-section">
          <h2>Welcome, {user ? user.first_name || user.email : 'User'}!</h2>
          <p>You are logged in.</p>
          <button onClick={handleLogout}>Logout</button>

          <h3>Your Data Sources</h3>
          {datasources.length === 0 ? (
            <p>No data sources found. Create one via API!</p>
          ) : (
            <ul>
              {datasources.map((ds) => (
                <li key={ds.id}>
                  <strong>{ds.name}</strong> ({ds.type}) -{' '}
                  <small>{ds.description}</small>
                </li>
              ))}
            </ul>
          )}

          <h3>Your Dashboards</h3>
          {dashboards.length === 0 ? (
            <p>No dashboards found. Create one via API!</p>
          ) : (
            <ul>
              {dashboards.map((db) => (
                <li key={db.id}>
                  <p>
                    <strong>{db.name}</strong> -{' '}
                    <small>{db.description}</small>
                  </p>
                  <button onClick={() => fetchDashboardData(db.id)} disabled={loadingDashboard}>
                    {loadingDashboard ? 'Loading...' : 'View Data'}
                  </button>
                  {selectedDashboardData &&
                    Object.keys(selectedDashboardData).length > 0 &&
                    Object.keys(selectedDashboardData).includes(
                      db.layout?.widgets?.[0]?.visualization_id
                    ) && ( // Basic check for data belonging to this dashboard
                      <div className="dashboard-data-preview">
                        <h4>Data for '{db.name}':</h4>
                        {db.layout?.widgets?.map((widget) => {
                          const vizId = widget.visualization_id;
                          const vizData = selectedDashboardData[vizId];
                          return vizData ? (
                            <div key={vizId} className="visualization-preview">
                              <h5>
                                {vizData.visualization?.name || `Visualization ${vizId}`} (
                                {vizData.visualization?.chart_type})
                              </h5>
                              <pre>{JSON.stringify(vizData.data, null, 2)}</pre>
                            </div>
                          ) : (
                            <p key={vizId}>
                              No data or error for visualization {vizId}.
                            </p>
                          );
                        })}
                      </div>
                    )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
```