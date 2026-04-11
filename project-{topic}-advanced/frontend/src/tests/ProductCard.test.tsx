```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../components/products/ProductCard';
import { AuthProvider } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { toast } from 'react-toastify';

// Mock the apiClient for this test file
jest.mock('../api/apiClient');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const mockProduct = {
  id: 'prod123',
  name: 'Test Product',
  description: 'This is a test product description.',
  price: 29.99,
  imageUrl: 'http://example.com/test-product.jpg',
  stock: 5,
  category: { id: 'cat1', name: 'Electronics' },
};

describe('ProductCard', () => {
  const renderWithRouterAndAuth = (component: React.ReactNode, isAuthenticated: boolean = false) => {
    return render(
      <BrowserRouter>
        <AuthProvider value={{
          user: isAuthenticated ? { id: 'user1', email: 'a@b.com', name: 'Test', role: 'USER' } : null,
          token: isAuthenticated ? 'mock-token' : null,
          isAuthenticated: isAuthenticated,
          isLoading: false,
          login: jest.fn(),
          logout: jest.fn(),
          updateUser: jest.fn(),
        }}>
          {component}
        </AuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test
  });

  it('renders product details correctly', () => {
    renderWithRouterAndAuth(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText(/This is a test product description./i)).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Test Product' })).toHaveAttribute('src', mockProduct.imageUrl);
  });

  it('displays "Add to Cart" button when in stock', () => {
    renderWithRouterAndAuth(<ProductCard product={mockProduct} />);
    expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add to Cart/i })).not.toBeDisabled();
  });

  it('displays "Out of Stock" button when out of stock', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    renderWithRouterAndAuth(<ProductCard product={outOfStockProduct} />);
    expect(screen.getByRole('button', { name: /Out of Stock/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Out of Stock/i })).toBeDisabled();
  });

  it('displays "Only X left in stock!" when stock is low', () => {
    const lowStockProduct = { ...mockProduct, stock: 3 };
    renderWithRouterAndAuth(<ProductCard product={lowStockProduct} />);
    expect(screen.getByText(/Only 3 left in stock!/i)).toBeInTheDocument();
  });

  it('calls toast.warn when "Add to Cart" is clicked by unauthenticated user', async () => {
    renderWithRouterAndAuth(<ProductCard product={mockProduct} />, false);

    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/i }));

    expect(toast.warn).toHaveBeenCalledWith('Please log in to add items to your cart.');
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  it('calls apiClient.post and toast.success when "Add to Cart" is clicked by authenticated user', async () => {
    mockApiClient.post.mockResolvedValueOnce({ data: { message: 'Item added' } });
    renderWithRouterAndAuth(<ProductCard product={mockProduct} />, true);

    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/i }));

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith('/cart', {
        productId: mockProduct.id,
        quantity: 1,
      });
    });
    expect(toast.success).toHaveBeenCalledWith(`${mockProduct.name} added to cart!`);
  });

  it('handles API error during "Add to Cart" for authenticated user', async () => {
    mockApiClient.post.mockRejectedValueOnce(new Error('Network error')); // Simulate an error
    renderWithRouterAndAuth(<ProductCard product={mockProduct} />, true);

    fireEvent.click(screen.getByRole('button', { name: /Add to Cart/i }));

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    });
    // The error toast is typically handled by the apiClient interceptor, so toast.error might not be called directly here
    // but rather mocked out in setupTests.ts or handled by the interceptor's own test.
    // For this component test, we primarily ensure the POST request was attempted.
  });
});
```

### Performance Tests (Conceptual)

Performance testing involves simulating load to identify bottlenecks. Tools like JMeter, k6, or Locust are commonly used.

**Key Performance Metrics to Monitor:**
*   **Response Time:** Latency for API requests.
*   **Throughput:** Number of requests processed per second.
*   **Error Rate:** Percentage of failed requests.
*   **Resource Utilization:** CPU, memory, network I/O of servers and database.

**Scenarios to Test:**
*   **Homepage Load:** Many concurrent users viewing the homepage (`GET /api/products`, `GET /api/products/categories`).
*   **Product Detail View:** Many concurrent users viewing a specific product (`GET /api/products/:id`).
*   **Login/Register:** Concurrent login/registration attempts.
*   **Add to Cart:** Users adding items to their cart (`POST /api/cart`).
*   **Checkout Process:** Simulating the full order flow (this would involve `cart` operations, then `order` creation).
*   **Admin Operations:** Concurrent admin CRUD operations on products/users (less frequent but important for responsiveness).

**Example k6 Script Idea (partial):**

```javascript
// frontend/tests/performance/homepage-load.js (conceptual k6 script)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100, // 100 virtual users
  duration: '30s', // for 30 seconds
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],  // Error rate should be less than 1%
  },
};

export default function () {
  const res = http.get('http://localhost:5000/api/products');
  check(res, {
    'is status 200': (r) => r.status === 200,
    'body contains products': (r) => r.body.includes('products'),
  });
  sleep(1); // Simulate user think time
}
```

---

## 8. Documentation

Comprehensive documentation is essential for maintainability, onboarding, and deployment.