```javascript
import React, { useEffect, useState, useCallback } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../api/products';
import { useAuth } from '../../contexts/AuthContext'; // For checking admin role client-side if needed

const initialProductState = {
  name: '',
  description: '',
  price: '',
  quantity: '',
  category: '',
  imageUrl: '',
};

const ManageProductsPage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentProduct, setCurrentProduct] = useState(initialProductState);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProducts(); // Fetch all products for admin view
      setProducts(data);
    } catch (err) {
      setError(err || 'Failed to fetch products for management.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchProducts();
    } else {
      setError('You are not authorized to view this page.');
      setLoading(false);
    }
  }, [user, fetchProducts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (isEditing) {
        await updateProduct(currentProduct.id, currentProduct);
        alert('Product updated successfully!');
      } else {
        await createProduct(currentProduct);
        alert('Product created successfully!');
      }
      setCurrentProduct(initialProductState);
      setIsEditing(false);
      fetchProducts(); // Refresh list
    } catch (err) {
      setFormError(err || 'Operation failed.');
    }
  };

  const handleEdit = (product) => {
    setCurrentProduct(product);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        alert('Product deleted successfully!');
        fetchProducts(); // Refresh list
      } catch (err) {
        setError(err || 'Failed to delete product.');
      }
    }
  };

  const handleCancelEdit = () => {
    setCurrentProduct(initialProductState);
    setIsEditing(false);
    setFormError('');
  };

  if (loading) {
    return <div className="text-center text-lg mt-8">Loading products for management...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 text-lg mt-8">Error: {error}</div>;
  }

  if (user && user.role !== 'admin') {
    return <div className="text-center text-red-500 text-lg mt-8">Access Denied: You must be an administrator to manage products.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-8">Manage Products</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
        {formError && <p className="text-red-500 mb-4">{formError}</p>}
        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" id="name" name="name" value={currentProduct.name} onChange={handleInputChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
            <input type="number" id="price" name="price" value={currentProduct.price} onChange={handleInputChange} required step="0.01" min="0" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
            <input type="number" id="quantity" name="quantity" value={currentProduct.quantity} onChange={handleInputChange} required min="0" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <input type="text" id="category" name="category" value={currentProduct.category} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">Image URL</label>
            <input type="url" id="imageUrl" name="imageUrl" value={currentProduct.imageUrl} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="description" name="description" value={currentProduct.description} onChange={handleInputChange} required rows="3" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
          </div>
          <div className="md:col-span-2 flex justify-end space-x-4">
            {isEditing && (
              <button type="button" onClick={handleCancelEdit} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300">
                Cancel
              </button>
            )}
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300">
              {isEditing ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Product List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${parseFloat(product.price).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(product)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                    <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageProductsPage;
```