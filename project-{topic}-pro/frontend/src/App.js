```javascript
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import api from './services/api'; // Our API service
import './App.css'; // Basic CSS

// Placeholder components
const Home = () => <h2>Welcome to the E-commerce Store!</h2>;
const About = () => <h2>About Us</h2>;

const ProductCard = ({ product }) => (
  <div className="product-card">
    <img src={product.imageUrl || 'https://via.placeholder.com/150'} alt={product.name} />
    <h3>{product.name}</h3>
    <p>{product.description?.substring(0, 100)}...</p>
    <p>${parseFloat(product.price).toFixed(2)}</p>
    <button>Add to Cart</button>
  </div>
);

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/products');
        setProducts(response.data.results);
      } catch (err) {
        setError('Failed to fetch products.');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) return <div>Loading products...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Products</h2>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

const AuthPage = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      let response;
      if (type === 'register') {
        response = await api.post('/auth/register', { firstName, lastName, email, password });
        setMessage('Registration successful! Please log in.');
        navigate('/login');
      } else {
        response = await api.post('/auth/login', { email, password });
        localStorage.setItem('accessToken', response.data.tokens.access.token);
        localStorage.setItem('refreshToken', response.data.tokens.refresh.token);
        setMessage('Login successful!');
        navigate('/'); // Redirect to home or dashboard
        // In a real app, update global auth state
      }
      console.log(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <h2>{type === 'register' ? 'Register' : 'Login'}</h2>
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      <form onSubmit={handleSubmit}>
        {type === 'register' && (
          <>
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </>
        )}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">{type === 'register' ? 'Register' : 'Login'}</button>
      </form>
      {type === 'register' ? (
        <p>Already have an account? <Link to="/login">Login here</Link></p>
      ) : (
        <p>Don't have an account? <Link to="/register">Register here</Link></p>
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="App">
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </ul>
        </nav>
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<AuthPage type="login" />} />
            <Route path="/register" element={<AuthPage type="register" />} />
            {/* Add more routes for product details, cart, checkout, user profile, admin panel etc. */}
            <Route path="*" element={<h2>404 Not Found</h2>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
```