```tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { FaShoppingCart, FaSpinner } from 'react-icons/fa';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  category: {
    id: string;
    name: string;
  };
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/products/${id}`);
        setProduct(response.data.data.product);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch product details');
        toast.error(err.response?.data?.message || 'Failed to fetch product details');
        navigate('/404'); // Redirect to 404 if product not found
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id, navigate]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.warn('Please log in to add items to your cart.');
      navigate('/login');
      return;
    }
    if (!product || quantity <= 0 || quantity > product.stock) {
      toast.error('Invalid quantity or product unavailable.');
      return;
    }

    setAddingToCart(true);
    try {
      await apiClient.post('/cart', {
        productId: product.id,
        quantity: quantity,
      });
      toast.success(`${quantity} x ${product.name} added to cart!`);
      // Optionally navigate to cart or update cart context
      navigate('/cart');
    } catch (error: any) {
      // Error handled by apiClient interceptor
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <FaSpinner className="animate-spin text-blue-500 text-4xl" />
        <span className="ml-4 text-lg">Loading product...</span>
      </div>
    );
  }

  if (error || !product) {
    return <div className="text-center py-12 text-red-500 text-xl">Error: {error || 'Product not found.'}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden my-10">
      <div className="md:flex">
        <div className="md:flex-shrink-0">
          <img
            className="h-96 w-full object-cover md:w-96"
            src={product.imageUrl}
            alt={product.name}
          />
        </div>
        <div className="p-8 flex-1">
          <div className="uppercase tracking-wide text-sm text-blue-600 font-semibold">
            {product.category?.name || 'Uncategorized'}
          </div>
          <h1 className="block mt-1 text-4xl leading-tight font-extrabold text-gray-900">
            {product.name}
          </h1>
          <p className="mt-4 text-gray-700 text-lg">{product.description}</p>

          <div className="mt-6 flex items-center space-x-4">
            <span className="text-5xl font-bold text-blue-800">${product.price.toFixed(2)}</span>
            {product.stock > 0 ? (
              <span className="text-green-600 text-lg">In Stock ({product.stock} available)</span>
            ) : (
              <span className="text-red-600 text-lg">Out of Stock</span>
            )}
          </div>

          <div className="mt-8 flex items-center space-x-4">
            <input
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
              className="w-24 p-3 border border-gray-300 rounded-md text-center text-lg focus:ring-blue-500 focus:border-blue-500"
              disabled={product.stock === 0 || addingToCart}
            />
            <button
              onClick={handleAddToCart}
              className={`flex items-center justify-center px-8 py-3 rounded-lg text-white font-semibold text-lg transition-colors duration-200 ${
                product.stock === 0 || addingToCart
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={product.stock === 0 || addingToCart}
            >
              {addingToCart ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Adding...
                </>
              ) : (
                <>
                  <FaShoppingCart className="mr-2" /> Add to Cart
                </>
              )}
            </button>
          </div>

          {product.stock <= 5 && product.stock > 0 && (
            <p className="mt-4 text-orange-500 text-md font-medium">
              Hurry, only {product.stock} left in stock!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
```