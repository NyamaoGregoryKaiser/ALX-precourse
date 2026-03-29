```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DashboardPage from '../pages/Dashboard';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock API calls
jest.mock('../api/api');
const mockApiGet = api.get as jest.Mock;
const mockApiPost = api.post as jest.Mock;
const mockApiPut = api.put as jest.Mock;
const mockApiDelete = api.delete as jest.Mock;

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: jest.fn(),
}));
const mockUseAuth = useAuth as jest.Mock;

const mockProducts = [
  {
    id: 'prod1',
    name: 'Product A',
    description: 'Description A',
    price: 10.00,
    isActive: true,
    userId: 'user1',
    user: { id: 'user1', email: 'user1@example.com' },
  },
  {
    id: 'prod2',
    name: 'Product B',
    description: 'Description B',
    price: 20.00,
    isActive: false,
    userId: 'user2',
    user: { id: 'user2', email: 'user2@example.com' },
  },
];

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for an authenticated 'user'
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      role: 'user',
      user: { id: 'user1', email: 'user1@example.com' }, // This user owns prod1
      login: jest.fn(),
      logout: jest.fn(),
    });
    mockApiGet.mockResolvedValue({ data: mockProducts });
    jest.spyOn(window, 'confirm').mockReturnValue(true); // Mock window.confirm for delete operations
  });

  it('should display loading state initially then fetch and display products', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading products.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/products');
      expect(screen.getByRole('heading', { name: /Product Dashboard/i })).toBeInTheDocument();
      expect(screen.getByText('Product A')).toBeInTheDocument();
      expect(screen.getByText('Product B')).toBeInTheDocument();
    });
  });

  it('should display error message if fetching products fails', async () => {
    mockApiGet.mockRejectedValueOnce({ response: { data: { message: 'Failed to retrieve products' } } });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to retrieve products/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Product A')).not.toBeInTheDocument();
  });

  it('should allow the owner to edit their product', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByText('Product A')).toBeInTheDocument());

    const editButton = screen.getByRole('button', { name: /Edit/i, hidden: true }); // Hidden because it's inside ProductCard
    fireEvent.click(editButton);

    // Form should pre-fill with Product A data
    expect(screen.getByLabelText(/Product Name:/i)).toHaveValue('Product A');
    expect(screen.getByLabelText(/Price:/i)).toHaveValue(10);
    expect(screen.getByRole('button', { name: /Update Product/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Price:/i), { target: { value: 12.50 } });
    mockApiPut.mockResolvedValueOnce({ data: {} });
    fireEvent.click(screen.getByRole('button', { name: /Update Product/i }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(`/products/${mockProducts[0].id}`, {
        ...mockProducts[0],
        price: 12.50,
      });
      expect(screen.getByText(/Product updated successfully!/i)).toBeInTheDocument();
    });
  });

  it('should allow admin to edit any product', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      role: 'admin',
      user: { id: 'admin1', email: 'admin@example.com' },
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByText('Product B')).toBeInTheDocument());

    // Admin tries to edit Product B (owned by user2)
    const editButton = screen.getAllByRole('button', { name: /Edit/i })[1]; // Second edit button
    fireEvent.click(editButton);

    expect(screen.getByLabelText(/Product Name:/i)).toHaveValue('Product B');
    fireEvent.change(screen.getByLabelText(/Price:/i), { target: { value: 25.00 } });
    mockApiPut.mockResolvedValueOnce({ data: {} });
    fireEvent.click(screen.getByRole('button', { name: /Update Product/i }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(`/products/${mockProducts[1].id}`, {
        ...mockProducts[1],
        price: 25.00,
      });
      expect(screen.getByText(/Product updated successfully!/i)).toBeInTheDocument();
    });
  });

  it('should allow the owner to delete their product', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByText('Product A')).toBeInTheDocument());

    const deleteButton = screen.getByRole('button', { name: /Delete/i, hidden: true });
    mockApiDelete.mockResolvedValueOnce({ data: {} });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith(`/products/${mockProducts[0].id}`);
      expect(screen.getByText(/Product deleted successfully!/i)).toBeInTheDocument();
      expect(screen.queryByText('Product A')).not.toBeInTheDocument(); // Product A should be gone
    });
  });

  it('should not show edit/delete buttons for products not owned by current user (non-admin)', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // For Product A (owned by user1), edit/delete should be visible
      const productACard = screen.getByText('Product A').closest('div');
      expect(productACard).toHaveTextContent('Edit');
      expect(productACard).toHaveTextContent('Delete');

      // For Product B (owned by user2), edit/delete should NOT be visible
      const productBCard = screen.getByText('Product B').closest('div');
      expect(productBCard).not.toHaveTextContent('Edit');
      expect(productBCard).not.toHaveTextContent('Delete');
    });
  });

  it('should display "Add New Product" form and handle creation', async () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /Add New Product/i })).toBeInTheDocument());

    const nameInput = screen.getByLabelText(/Product Name:/i);
    const priceInput = screen.getByLabelText(/Price:/i);
    const addButton = screen.getByRole('button', { name: /Add Product/i });

    fireEvent.change(nameInput, { target: { value: 'New Test Product' } });
    fireEvent.change(priceInput, { target: { value: 55.55 } });
    mockApiPost.mockResolvedValueOnce({ data: {} }); // Mock create API call

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/products', {
        name: 'New Test Product',
        description: '', // Default description
        price: 55.55,
        isActive: true,
      });
      expect(screen.getByText(/Product created successfully!/i)).toBeInTheDocument();
    });
  });

  it('should not render dashboard if not authenticated', () => {
    mockUseAuth.mockReturnValueOnce({
      isAuthenticated: false,
      loading: false,
      user: null,
      role: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Please log in to view the dashboard./i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Product Dashboard/i })).not.toBeInTheDocument();
  });
});
```