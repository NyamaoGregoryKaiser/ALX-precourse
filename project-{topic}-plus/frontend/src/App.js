import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css'; // Assume you have some basic CSS

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

function App() {
  const [message, setMessage] = useState("Loading...");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Example: Fetch categories
    axios.get(`${API_BASE_URL}/categories`)
      .then(response => {
        setCategories(response.data.data);
      })
      .catch(error => {
        console.error("Error fetching categories:", error);
        setError("Failed to fetch categories.");
      });

    // Example: Fetch products
    axios.get(`${API_BASE_URL}/products?size=5&sort=name`)
      .then(response => {
        setProducts(response.data.data.content);
        setMessage("Backend is running!");
      })
      .catch(error => {
        console.error("Error fetching products:", error);
        setError("Failed to fetch products. Is the backend running?");
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>ALX E-commerce Frontend (Placeholder)</h1>
        <p>{message}</p>
        {error && <p className="error-message">{error}</p>}

        <h2>Categories</h2>
        {categories.length > 0 ? (
          <ul>
            {categories.map(category => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ul>
        ) : (
          <p>No categories found.</p>
        )}

        <h2>Featured Products</h2>
        {products.length > 0 ? (
          <div className="product-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                <h3>{product.name}</h3>
                <p>${product.price.toFixed(2)}</p>
                <p>Category: {product.categoryName}</p>
                {product.imageUrl && <img src={product.imageUrl} alt={product.name} style={{ width: '100px', height: '100px', objectFit: 'cover' }} />}
              </div>
            ))}
          </div>
        ) : (
          <p>No products found.</p>
        )}

        <p>This is a minimal React app to demonstrate connectivity with the backend.</p>
        <p>For a full frontend, you would expand on this with routing, dedicated components, state management, and more sophisticated UI.</p>
      </header>
    </div>
  );
}

export default App;
```
#### `frontend/Dockerfile`
```dockerfile