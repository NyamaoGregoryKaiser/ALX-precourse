import React, { useState, useEffect } from 'react';
import './App.css';

interface Message {
  status: string;
  message: string;
  uptime?: number;
  timestamp?: string;
}

function App() {
  const [healthMessage, setHealthMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/v1/health'); // Assumes proxy to backend on /api
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Message = await response.json();
        setHealthMessage(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Project Security System Frontend</h1>
        <p>This is a minimal React frontend to demonstrate integration with the backend API.</p>
        <h2>Backend Health Check:</h2>
        {loading && <p>Loading backend health...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}. Make sure the backend is running!</p>}
        {healthMessage && (
          <div>
            <p>Status: <span style={{ color: healthMessage.status === 'success' ? 'lightgreen' : 'red' }}>{healthMessage.status}</span></p>
            <p>Message: {healthMessage.message}</p>
            {healthMessage.uptime && <p>Uptime: {Math.floor(healthMessage.uptime / 3600)}h {Math.floor((healthMessage.uptime % 3600) / 60)}m {Math.floor(healthMessage.uptime % 60)}s</p>}
            {healthMessage.timestamp && <p>Timestamp: {new Date(healthMessage.timestamp).toLocaleString()}</p>}
          </div>
        )}
        <p>
          More features would be implemented here, including user authentication,
          project/task management, and robust error display.
        </p>
        <p>
          Check the `README.md` and `docs/api.yaml` for API endpoints.
        </p>
      </header>
    </div>
  );
}

export default App;
```