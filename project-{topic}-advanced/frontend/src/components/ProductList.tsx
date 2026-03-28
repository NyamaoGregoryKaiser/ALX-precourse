"use client";

import { useState, useEffect } from 'react';
import { Product } from '@/types/product'; // Assuming a type defined from backend
import { getProducts } from '@/lib/api';
import Link from 'next/link';

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getProducts();
        setProducts(data.products);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) return <div className="text-center text-lg">Loading products...</div>;
  if (error) return <div className="text-center text-red-500 text-lg">Error: {error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <div key={product.id} className="border rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-300">
          <img src={product.imageUrl || '/placeholder.png'} alt={product.name} className="w-full h-48 object-cover rounded-md mb-4" />
          <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
          <p className="text-gray-600 mb-2">${product.price.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mb-4">{product.description.substring(0, 100)}...</p>
          <Link href={`/products/${product.id}`} className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-300">
            View Details
          </Link>
        </div>
      ))}
      {products.length === 0 && <p className="col-span-full text-center text-gray-500">No products found.</p>}
    </div>
  );
}