```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import './UnauthorizedPage.css';

const UnauthorizedPage = () => {
  return (
    <div className="unauthorized-container">
      <h1 className="unauthorized-title">403 - Unauthorized Access</h1>
      <p className="unauthorized-message">You do not have permission to view this page.</p>
      <Link to="/dashboard" className="unauthorized-button">Go to Dashboard</Link>
      <Link to="/" className="unauthorized-button secondary">Go to Home</Link>
    </div>
  );
};

export default UnauthorizedPage;
```