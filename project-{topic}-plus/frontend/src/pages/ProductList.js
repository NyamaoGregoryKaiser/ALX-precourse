```javascript
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import './ProductList.css';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalItems: 0 });
  const [filters, setFilters] = useState({ search: '', category: '', minPrice: '', maxPrice: '' });
  const { user, isAdmin } = useAuth();

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      }).toString();

      const response = await apiClient.get(`/products?${queryParams}`);
      setProducts(response.data.data.products);
      setPagination({
        ...pagination,
        totalItems: response.data.data.totalItems,
        totalPages: response.data.data.totalPages,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products.');
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, pagination.limit]); // Re-fetch on page/limit change

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
    fetchProducts();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to soft-delete this product?')) {
      try {
        await apiClient.delete(`/products/${id}`);
        setProducts(products.filter(p => p.id !== id)); // Optimistic UI update
        // Or re-fetch products to get the latest state including soft-deleted ones (if visible)
        fetchProducts();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete product.');
        console.error('Failed to delete product:', err);
      }
    }
  };

  const handleRestore = async (id) => {
    if (window.confirm('Are you sure you want to restore this product?')) {
      try {
        await apiClient.post(`/products/${id}/restore`);
        // Re-fetch products to show the restored item
        fetchProducts();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to restore product.');
        console.error('Failed to restore product:', err);
      }
    }
  };

  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="product-list-container">
      <h2>Product Catalog</h2>

      <div className="product-actions">
        {(user?.role === 'admin' || user?.role === 'user') && (
          <Link to="/products/new" className="button primary">Add New Product</Link>
        )}
      </div>

      <form onSubmit={handleFilterSubmit} className="product-filters">
        <input
          type="text"
          name="search"
          placeholder="Search by name or description..."
          value={filters.search}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="category"
          placeholder="Filter by category..."
          value={filters.category}
          onChange={handleFilterChange}
        />
        <input
          type="number"
          name="minPrice"
          placeholder="Min Price"
          value={filters.minPrice}
          onChange={handleFilterChange}
        />
        <input
          type="number"
          name="maxPrice"
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={handleFilterChange}
        />
        <button type="submit" className="button">Apply Filters</button>
      </form>

      {products.length === 0 ? (
        <p>No products found matching your criteria.</p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <img src={product.imageUrl || 'https://via.placeholder.com/150'} alt={product.name} />
              <h3>{product.name}</h3>
              <p className="price">${product.price.toFixed(2)}</p>
              <p>Stock: {product.stock}</p>
              <p className="category">Category: {product.category || 'N/A'}</p>
              <p className="owner">Owner: {product.owner?.username || 'Unknown'}</p>
              <div className="card-actions">
                <Link to={`/products/${product.id}`} className="button view">View</Link>
                {(isAdmin || (user && product.userId === user.id)) && (
                  <>
                    <Link to={`/products/edit/${product.id}`} className="button edit">Edit</Link>
                    <button onClick={() => handleDelete(product.id)} className="button delete">Delete</button>
                  </>
                )}
                {isAdmin && product.deletedAt && (
                  <button onClick={() => handleRestore(product.id)} className="button restore">Restore</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          disabled={pagination.page <= 1}
        >
          Previous
        </button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button
          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          disabled={pagination.page >= pagination.totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ProductList;
```