```javascript
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import './ProductForm.css';

const ProductForm = () => {
  const { id } = useParams(); // For edit mode
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      const fetchProduct = async () => {
        setLoading(true);
        try {
          const response = await apiClient.get(`/products/${id}`);
          const fetchedProduct = response.data.data;

          // Authorization check: User can only edit their own products, unless admin
          if (!isAdmin && fetchedProduct.userId !== user.id) {
            setError('You are not authorized to edit this product.');
            setLoading(false);
            return;
          }

          setProduct({
            name: fetchedProduct.name,
            description: fetchedProduct.description || '',
            price: fetchedProduct.price,
            stock: fetchedProduct.stock,
            category: fetchedProduct.category || '',
            imageUrl: fetchedProduct.imageUrl || '',
          });
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load product for editing.');
          console.error('Failed to load product:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, user, isAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const dataToSend = {
        ...product,
        price: parseFloat(product.price),
        stock: parseInt(product.stock, 10),
      };

      if (isEditMode) {
        await apiClient.put(`/products/${id}`, dataToSend);
      } else {
        await apiClient.post('/products', dataToSend);
      }
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading product data...</div>;
  if (error && isEditMode) return <div className="error-message">{error}</div>; // Only show auth error in edit mode initial load

  return (
    <div className="product-form-container">
      <h2>{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
      {error && !isEditMode && <p className="error-message">{error}</p>} {/* Show general errors for add mode */}
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label htmlFor="name">Product Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={product.name}
            onChange={handleChange}
            required
            maxLength="100"
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            name="description"
            value={product.description}
            onChange={handleChange}
            rows="4"
          />
        </div>
        <div className="form-group">
          <label htmlFor="price">Price:</label>
          <input
            type="number"
            id="price"
            name="price"
            value={product.price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label htmlFor="stock">Stock:</label>
          <input
            type="number"
            id="stock"
            name="stock"
            value={product.stock}
            onChange={handleChange}
            required
            min="0"
            step="1"
          />
        </div>
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <input
            type="text"
            id="category"
            name="category"
            value={product.category}
            onChange={handleChange}
            maxLength="50"
          />
        </div>
        <div className="form-group">
          <label htmlFor="imageUrl">Image URL:</label>
          <input
            type="url"
            id="imageUrl"
            name="imageUrl"
            value={product.imageUrl}
            onChange={handleChange}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Product' : 'Add Product')}
        </button>
        <button type="button" onClick={() => navigate('/products')} className="button secondary">
          Cancel
        </button>
      </form>
    </div>
  );
};

export default ProductForm;
```