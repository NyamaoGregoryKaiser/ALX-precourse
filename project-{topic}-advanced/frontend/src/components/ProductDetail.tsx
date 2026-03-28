"use client";

import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { getProductById } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

interface ProductDetailProps {
  productId: string;
}

export default function ProductDetail({ productId }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const router = useRouter();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProductById(productId);
        setProduct(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      alert(`${quantity} x ${product.name} added to cart!`);
      router.push('/cart');
    }
  };

  if (loading) return <div className="text-center text-lg">Loading product...</div>;
  if (error) return <div className="text-center text-red-500 text-lg">Error: {error}</div>;
  if (!product) return <div className="text-center text-lg">Product not found.</div>;

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6 flex flex-col md:flex-row">
      <div className="md:w-1/2">
        <img src={product.imageUrl || '/placeholder.png'} alt={product.name} className="w-full h-80 object-contain rounded-md mb-6 md:mb-0" />
      </div>
      <div className="md:w-1/2 md:pl-8">
        <h1 className="text-4xl font-extrabold mb-4">{product.name}</h1>
        <p className="text-gray-700 text-lg mb-4">{product.description}</p>
        <p className="text-3xl font-bold text-blue-600 mb-4">${product.price.toFixed(2)}</p>
        <p className={`text-lg font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'} mb-4`}>
          {product.stock > 0 ? `In Stock: ${product.stock}` : 'Out of Stock'}
        </p>

        {product.stock > 0 && (
          <div className="flex items-center space-x-4 mb-6">
            <label htmlFor="quantity" className="text-lg font-medium">Quantity:</label>
            <input
              type="number"
              id="quantity"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddToCart}
              className="bg-green-500 text-white py-3 px-6 rounded-lg text-lg font-semibold hover:bg-green-600 transition-colors duration-300"
            >
              Add to Cart
            </button>
          </div>
        )}

        <div className="text-sm text-gray-500">
          <p>Category: {product.category?.name || 'Uncategorized'}</p>
          <p>SKU: {product.id}</p>
        </div>
      </div>
    </div>
  );
}