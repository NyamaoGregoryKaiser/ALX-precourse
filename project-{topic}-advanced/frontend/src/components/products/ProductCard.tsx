```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../hooks/useAuth';

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

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isAuthenticated } = useAuth();

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.warn('Please log in to add items to your cart.');
      return;
    }
    try {
      await apiClient.post('/cart', {
        productId: product.id,
        quantity: 1,
      });
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      // Error is handled by apiClient interceptor
      console.error('Failed to add to cart:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
      <Link to={`/products/${product.id}`}>
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-48 object-cover object-center transform hover:scale-105 transition-transform duration-300"
        />
      </Link>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-xl font-semibold mb-2 text-gray-800 line-clamp-2">
          <Link to={`/products/${product.id}`} className="hover:text-blue-600">
            {product.name}
          </Link>
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">{product.description}</p>
        <div className="mt-auto flex justify-between items-center pt-2">
          <span className="text-2xl font-bold text-blue-700">${product.price.toFixed(2)}</span>
          <button
            onClick={handleAddToCart}
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors duration-200
            ${product.stock > 0
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'}
            `}
            disabled={product.stock <= 0}
          >
            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
        {product.stock <= 5 && product.stock > 0 && (
          <p className="text-sm text-orange-500 mt-2">Only {product.stock} left in stock!</p>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
```