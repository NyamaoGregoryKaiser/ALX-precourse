```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get(`/products/${id}`);
        setProduct(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch product details.');
        console.error('Failed to fetch product details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to soft-delete this product?')) {
      try {
        await apiClient.delete(`/products/${id}`);
        alert('Product soft-deleted successfully!');
        navigate('/products');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete product.');
        console.error('Failed to delete product:', err);
      }
    }
  };

  const handleRestore = async () => {
    if (window.confirm('Are you sure you want to restore this product?')) {
      try {
        await apiClient.post(`/products/${id}/restore`);
        alert('Product restored successfully!');
        setProduct(prev => ({ ...prev, deletedAt: null })); // Update local state if successful
        navigate(`/products/${id}`); // Refresh or stay on page
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to restore product.');
        console.error('Failed to restore product:', err);
      }
    }
  };

  if (loading) return <div className="loading">Loading product details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!product) return <div className="error-message">Product not found.</div>;

  const canEditOrDelete = isAdmin || (user && product.userId === user.id);

  return (
    <div className="product-detail-container">
      <button onClick={() => navigate('/products')} className="button back-button">
        &larr; Back to Products
      </button>
      <div className="product-content">
        <div className="product-image">
          <img src={product.imageUrl || 'https://via.placeholder.com/400x300'} alt={product.name} />
        </div>
        <div className="product-info">
          <h1>{product.name}</h1>
          {product.deletedAt && <p className="status-badge deleted">Soft-Deleted</p>}
          <p className="description">{product.description || 'No description available.'}</p>
          <p className="price">Price: <span>${product.price.toFixed(2)}</span></p>
          <p className="stock">Stock: <span>{product.stock} units</span></p>
          <p className="category">Category: <span>{product.category || 'N/A'}</span></p>
          <p className="owner">Owner: <span>{product.owner?.username || 'Unknown'} ({product.owner?.email || 'N/A'})</span></p>
          <p className="dates">Created: {new Date(product.createdAt).toLocaleDateString()} | Last Updated: {new Date(product.updatedAt).toLocaleDateString()}</p>

          <div className="product-actions">
            {canEditOrDelete && (
              <Link to={`/products/edit/${product.id}`} className="button primary">Edit Product</Link>
            )}
            {canEditOrDelete && (
              <button onClick={handleDelete} className="button delete">Soft Delete Product</button>
            )}
            {isAdmin && product.deletedAt && (
              <button onClick={handleRestore} className="button restore">Restore Product</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
```