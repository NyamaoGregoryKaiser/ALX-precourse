import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllProducts, deleteProduct } from '../services/productService';
import { useAuth } from '../contexts/AuthContext';

function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const { user, isAuthenticated } = useAuth();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAllProducts(page, limit, search);
      setProducts(response.data.products);
      setTotal(response.data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const token = localStorage.getItem('token');
        await deleteProduct(productId, token);
        fetchProducts(); // Refresh the list
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) return <p>Loading products...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="product-list-container">
      <h2>Product Catalog</h2>
      <input
        type="text"
        placeholder="Search products by name..."
        className="search-bar"
        value={search}
        onChange={handleSearchChange}
      />
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <>
          <div className="product-list">
            {products.map((product) => {
              const isOwnerOrAdmin = isAuthenticated && (user?.role === 'admin' || user?.id === product.userId);
              return (
                <div key={product.id} className="product-card">
                  <h3>{product.name}</h3>
                  <p>{product.description.substring(0, 100)}...</p>
                  <p className="price">${parseFloat(product.price).toFixed(2)}</p>
                  <p className="stock">Stock: {product.stock}</p>
                  <p className="creator">Created by: {product.User?.username || 'N/A'}</p>
                  <div className="product-card-actions">
                    <Link to={`/products/${product.id}`} className="button view-button">View</Link>
                    {isOwnerOrAdmin && (
                      <>
                        <Link to={`/products/edit/${product.id}`} className="button edit-button">Edit</Link>
                        <button type="button" onClick={() => handleDelete(product.id)} className="button delete-button">Delete</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pagination">
            <button type="button" onClick={() => setPage((prev) => prev - 1)} disabled={page === 1}>
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" onClick={() => setPage((prev) => prev + 1)} disabled={page === totalPages}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductListPage;
```