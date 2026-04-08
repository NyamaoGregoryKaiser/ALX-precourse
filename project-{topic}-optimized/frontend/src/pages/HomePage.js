import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="home-page">
      <h1>Welcome to the Enterprise API System</h1>
      <p>
        This is a comprehensive, full-scale API development system built with Node.js (Express) and React,
        demonstrating production-ready practices including authentication, authorization, caching,
        logging, and robust error handling.
      </p>
      <p>
        Explore our product catalog or register to manage your own products!
      </p>
      <Link to="/products" className="call-to-action">View Products</Link>
    </div>
  );
}

export default HomePage;
```