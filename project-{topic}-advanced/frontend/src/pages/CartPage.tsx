```tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { toast } from 'react-toastify';
import { FaTrashAlt, FaPlusSquare, FaMinusSquare, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
}

interface CartItem {
  id: string;
  quantity: number;
  productId: string;
  product: Product;
}

interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
}

const CartPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth status to load

    if (!isAuthenticated) {
      toast.warn('Please log in to view your cart.');
      navigate('/login');
      return;
    }

    const fetchCart = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get('/cart');
        setCart(response.data.data.cart);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch cart');
        toast.error(err.response?.data?.message || 'Failed to fetch cart');
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [isAuthenticated, authLoading, navigate]);

  const updateCartItemQuantity = async (cartItemId: string, newQuantity: number) => {
    try {
      const response = await apiClient.patch(`/cart/${cartItemId}`, { quantity: newQuantity });
      setCart(response.data.data.cart);
      toast.success('Cart updated!');
    } catch (err: any) {
      console.error('Failed to update cart item:', err);
      // Error handled by interceptor, no need for toast here
    }
  };

  const removeItem = async (cartItemId: string) => {
    try {
      const response = await apiClient.delete(`/cart/${cartItemId}`);
      setCart(response.data.data.cart);
      toast.info('Item removed from cart.');
    } catch (err: any) {
      console.error('Failed to remove cart item:', err);
    }
  };

  const clearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your entire cart?')) return;
    try {
      const response = await apiClient.delete('/cart');
      setCart(response.data.data.cart);
      toast.info('Cart cleared.');
    } catch (err: any) {
      console.error('Failed to clear cart:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <FaSpinner className="animate-spin text-blue-500 text-4xl" />
        <span className="ml-4 text-lg">Loading cart...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500 text-xl">Error: {error}</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h2>
        <p className="text-gray-600">Looks like you haven't added anything to your cart yet.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-lg font-medium"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-gray-900">Your Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center border-b border-gray-200 py-4 last:border-b-0">
              <img
                src={item.product.imageUrl}
                alt={item.product.name}
                className="w-24 h-24 object-cover rounded-md mr-4"
              />
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-gray-800">{item.product.name}</h3>
                <p className="text-gray-600">${item.product.price.toFixed(2)} each</p>
                {item.product.stock < item.quantity && (
                  <p className="text-red-500 text-sm">Only {item.product.stock} left in stock!</p>
                )}
              </div>
              <div className="flex items-center space-x-2 mr-4">
                <button
                  onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="p-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  <FaMinusSquare size={20} />
                </button>
                <span className="text-lg font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.product.stock}
                  className="p-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  <FaPlusSquare size={20} />
                </button>
              </div>
              <span className="text-xl font-bold text-gray-900 w-24 text-right">
                ${(item.quantity * item.product.price).toFixed(2)}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="ml-4 p-2 text-red-500 hover:text-red-700"
              >
                <FaTrashAlt size={20} />
              </button>
            </div>
          ))}
          <div className="flex justify-end mt-6">
            <button
              onClick={clearCart}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 text-sm"
            >
              Clear Cart
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Order Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between text-lg text-gray-700">
              <span>Subtotal ({cart.items.reduce((acc, item) => acc + item.quantity, 0)} items)</span>
              <span>${cart.total.toFixed(2)}</span>
            </div>
            {/* Add shipping, tax, discounts here */}
            <div className="flex justify-between text-lg text-gray-700">
              <span>Shipping</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-lg text-gray-700">
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-gray-900 border-t pt-4 mt-4">
              <span>Order Total</span>
              <span>${cart.total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={() => toast.info('Checkout functionality coming soon!')}
            className="w-full mt-8 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-lg font-medium"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
```
*(Additional Frontend Pages/Components: `RegisterPage.tsx`, `ProfilePage.tsx`, `PrivateRoute.tsx`, `NotFoundPage.tsx` would be similar in structure to above examples.)*

---

## 5. Database Layer

Using PostgreSQL as the relational database and Prisma as the ORM. Prisma handles schema definition, migrations, and provides a type-safe client for interactions.