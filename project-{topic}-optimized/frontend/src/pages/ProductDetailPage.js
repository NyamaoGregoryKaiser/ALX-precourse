import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductById, deleteProduct } from '../services/productService';
import { useAuth } from '../contexts/AuthContext';

function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await getProductById(id);
        setProduct(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const token = localStorage.getItem('token');
        await deleteProduct(id, token);
        navigate('/products'); // Redirect to product list after deletion
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  if (loading) return <p>Loading product...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!product) return <p>Product not found.</p>;

  const isOwnerOrAdmin = isAuthenticated && (user?.role === 'admin' || user?.id === product.userId);

  return (
    <div className="product-detail-container">
      <h2>{product.name}</h2>
      <p><span className="label">Description:</span> {product.description}</p>
      <p><span className="label">Price:</span> ${parseFloat(product.price).toFixed(2)}</p>
      <p><span className="label">Stock:</span> {product.stock}</p>
      <p><span className="label">Created By:</span> {product.User?.username || 'Unknown'}</p>
      <p><span className="label">Created At:</span> {new Date(product.createdAt).toLocaleDateString()}</p>
      <p><span className="label">Last Updated:</span> {new Date(product.updatedAt).toLocaleDateString()}</p>

      {isOwnerOrAdmin && (
        <div className="product-detail-actions">
          <Link to={`/products/edit/${product.id}`} className="button edit-button">Edit</Link>
          <button type="button" onClick={handleDelete} className="button delete-button">Delete</button>
        </div>
      )}
    </div>
  );
}

export default ProductDetailPage;
```