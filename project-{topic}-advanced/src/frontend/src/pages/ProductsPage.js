```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { getProducts } from '../api/products';
import ProductCard from '../components/ProductCard';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    order: 'DESC',
    page: 1,
    limit: 12,
  });
  const [totalProducts, setTotalProducts] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getProducts(filters);
      setProducts(response);
      // Assuming getProducts returns a data object that includes total count and other pagination info
      // If backend returns 'data' as just array, you'd need to adjust here or fetch total separately.
      // For this example, let's assume `getProducts` returns an array, and we update `totalProducts` based on this or a separate endpoint.
      // For now, let's mock totalProducts based on the fetched array length if no explicit total is provided
      setTotalProducts(prev => (filters.page === 1 ? response.length : prev + response.length));
    } catch (err) {
      setError(err || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 })); // Reset to page 1 on filter change
  };

  const handleSortChange = (e) => {
    const { value } = e.target;
    const [sortBy, order] = value.split(':');
    setFilters(prev => ({ ...prev, sortBy, order, page: 1 }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({ ...prev, page: prev.page + 1 }));
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-8">Product Catalog</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Filters & Sorting</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Search by name"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <input
              type="text"
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Filter by category"
            />
          </div>
          <div>
            <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700">Min Price</label>
            <input
              type="number"
              id="minPrice"
              name="minPrice"
              value={filters.minPrice}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Minimum price"
            />
          </div>
          <div>
            <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700">Max Price</label>
            <input
              type="number"
              id="maxPrice"
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Maximum price"
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700">Sort By</label>
          <select
            id="sort"
            name="sort"
            value={`${filters.sortBy}:${filters.order}`}
            onChange={handleSortChange}
            className="mt-1 block w-full md:w-1/3 border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="createdAt:DESC">Newest First</option>
            <option value="createdAt:ASC">Oldest First</option>
            <option value="name:ASC">Name (A-Z)</option>
            <option value="name:DESC">Name (Z-A)</option>
            <option value="price:ASC">Price (Low to High)</option>
            <option value="price:DESC">Price (High to Low)</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-center text-xl text-indigo-600">Loading products...</p>}
      {error && <p className="text-center text-xl text-red-500">Error: {error}</p>}

      {!loading && products.length === 0 && !error && (
        <p className="text-center text-xl text-gray-600">No products found matching your criteria.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length > 0 && products.length < totalProducts && ( // Simple logic for load more
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300"
            disabled={loading}
          >
            {loading ? 'Loading More...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
```