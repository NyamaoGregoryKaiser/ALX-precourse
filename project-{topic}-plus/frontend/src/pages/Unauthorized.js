```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import './Unauthorized.css';

const Unauthorized = () => {
  return (
    <div className="unauthorized-container">
      <h1>403 - Unauthorized Access</h1>
      <p>You do not have permission to view this page or perform this action.</p>
      <Link to="/" className="button">Go to Homepage</Link>
      <Link to="/products" className="button secondary">View Products</Link>
    </div>
  );
};

export default Unauthorized;
```