"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          ALX Shop
        </Link>
        <div className="space-x-4">
          <Link href="/products" className="hover:text-gray-300">Products</Link>
          <Link href="/cart" className="hover:text-gray-300">
            Cart ({cartItemCount})
          </Link>
          {user ? (
            <>
              <span className="text-gray-300">Hello, {user.name}</span>
              {user.role === 'ADMIN' && (
                <Link href="/admin/dashboard" className="hover:text-gray-300">Admin</Link>
              )}
              <button onClick={logout} className="hover:text-gray-300">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-gray-300">Login</Link>
              <Link href="/register" className="hover:text-gray-300">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}