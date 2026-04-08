import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createProduct, getProductById, updateProduct } from '../services/productService';

function ProductFormPage() {
  const { id } = useParams(); // For edit mode
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isEditMode = Boolean(id);

  useEffect(() => {
    if (isEditMode) {
      const fetchProduct = async () => {
        setLoading(true);
        try {
          const response = await getProductById(id);
          const product = response.data;
          setFormData({
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
          });
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load product for editing');
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      let response;
      if (isEditMode) {
        response = await updateProduct(id, formData, token);
        setSuccess('Product updated successfully!');
      } else {
        response = await createProduct(formData, token);
        setSuccess('Product created successfully!');
        setFormData({ name: '', description: '', price: '', stock: '' }); // Clear form
      }
      navigate(`/products/${response.data.id}`); // Redirect to detail page
    } catch (err) {
      console.error('Submission error:', err.response?.data?.errors || err.response?.data?.message || err.message);
      let errorMessage = err.response?.data?.message || 'An unexpected error occurred.';
      if (err.response?.data?.errors) {
        errorMessage = err.response.data.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) return <p>Loading product data...</p>;

  return (
    <div className="form-container">
      <h2>{isEditMode ? 'Edit Product' : 'Create New Product'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Product Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="price">Price:</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleChange}
            step="0.01"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="stock">Stock:</label>
          <input
            type="number"
            id="stock"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            step="1"
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        <button type="submit" className="form-button" disabled={loading}>
          {loading ? 'Submitting...' : (isEditMode ? 'Update Product' : 'Create Product')}
        </button>
      </form>
    </div>
  );
}

export default ProductFormPage;
```