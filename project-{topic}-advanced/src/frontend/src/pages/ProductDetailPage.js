```javascript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../api/products';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProductById(id);
        setProduct(data);
      } catch (err) {
        setError(err || 'Failed to fetch product details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return <div className="text-center text-lg mt-8">Loading product details...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 text-lg mt-8">Error: {error}</div>;
  }

  if (!product) {
    return <div className="text-center text-lg mt-8">Product not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 bg-white shadow-lg rounded-lg">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
      >
        &larr; Back to Products
      </button>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="md:w-1/2">
          <img
            src={product.imageUrl || 'https://via.placeholder.com/600x400?text=No+Image'}
            alt={product.name}
            className="w-full h-auto object-cover rounded-lg shadow-md"
          />
        </div>
        <div className="md:w-1/2">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{product.name}</h1>
          <p className="text-gray-700 text-lg mb-6">{product.description}</p>
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl font-bold text-indigo-700">${parseFloat(product.price).toFixed(2)}</span>
            <span className="text-lg text-gray-600">Available: {product.quantity} units</span>
          </div>
          {product.category && (
            <p className="text-md text-gray-500 mb-2">Category: <span className="font-semibold">{product.category}</span></p>
          )}
          <p className="text-sm text-gray-400 mt-4">
            Created: {new Date(product.createdAt).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-400">
            Last Updated: {new Date(product.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
```