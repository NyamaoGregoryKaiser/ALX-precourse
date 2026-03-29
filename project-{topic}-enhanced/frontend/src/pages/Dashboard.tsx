```typescript
import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';
import ProductForm from '../components/ProductForm';

// Interfaces for data types
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  isActive: boolean;
  userId: string;
  user?: {
    id: string;
    email: string;
  };
}

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 2rem auto;
  padding: 20px;
  background-color: var(--card-background);
  border-radius: 8px;
  box-shadow: var(--box-shadow);
`;

const Header = styled.h1`
  text-align: center;
  color: var(--dark-color);
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  margin-top: 2rem;
  margin-bottom: 1.5rem;
  color: var(--dark-color);
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
`;

const ProductList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const ProductCard = styled.div<{ isActive: boolean }>`
  background-color: var(--light-color);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  opacity: ${props => props.isActive ? 1 : 0.7};
  position: relative;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.1);
  }
`;

const ProductStatus = styled.span<{ isActive: boolean }>`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: ${props => props.isActive ? var(--success-color) : var(--danger-color)};
  color: white;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: bold;
`;

const ProductName = styled.h3`
  color: var(--primary-color);
  margin-bottom: 0.5rem;
`;

const ProductPrice = styled.p`
  font-weight: bold;
  font-size: 1.2rem;
  color: var(--text-color);
  margin-bottom: 1rem;
`;

const ProductDescription = styled.p`
  font-size: 0.9rem;
  color: var(--secondary-color);
  margin-bottom: 1rem;
`;

const ProductOwner = styled.p`
  font-size: 0.8rem;
  color: var(--info-color);
  margin-top: 0.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 1rem;
`;

const EditButton = styled.button`
  background-color: var(--info-color);
  &:hover {
    background-color: darken(var(--info-color), 10%);
  }
`;

const DeleteButton = styled.button`
  background-color: var(--danger-color);
  &:hover {
    background-color: darken(var(--danger-color), 10%);
  }
`;

const Alert = styled.div<{ type: 'success' | 'error' | 'warning' }>`
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 5px;
  color: white;
  font-weight: bold;
  background-color: ${props => {
    switch (props.type) {
      case 'success': return 'var(--success-color)';
      case 'error': return 'var(--danger-color)';
      case 'warning': return 'var(--warning-color)';
      default: return 'var(--info-color)';
    }
  }};
  color: ${props => props.type === 'warning' ? 'var(--dark-color)' : 'white'};
`;

/**
 * Dashboard page displaying a list of products and allowing product creation/editing.
 * Admin users can edit/delete all products, regular users only their own.
 */
const DashboardPage: React.FC = () => {
  const { user, role, isAuthenticated } = useAuth(); // Assume `user` is also available if `isAuthenticated` is true
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper function to get the current user's ID from AuthContext
  const currentUserId = user?.id; // Assuming user.id is exposed from AuthContext

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated, currentUserId]); // Re-fetch if auth state or user ID changes

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.message || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    setError(null);
    setSuccessMessage(null);
    try {
      await api.delete(`/products/${productId}`);
      setSuccessMessage('Product deleted successfully!');
      fetchProducts(); // Refresh list
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.response?.data?.message || 'Failed to delete product.');
    }
  };

  const handleProductFormSubmit = async (productData: Partial<Product>) => {
    setError(null);
    setSuccessMessage(null);
    try {
      if (editingProduct) {
        // Update product
        await api.put(`/products/${editingProduct.id}`, productData);
        setSuccessMessage('Product updated successfully!');
        setEditingProduct(null); // Exit editing mode
      } else {
        // Create new product
        await api.post('/products', productData);
        setSuccessMessage('Product created successfully!');
      }
      fetchProducts(); // Refresh list
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.message || 'Failed to save product.');
    }
  };

  if (!isAuthenticated) {
    return <p>Please log in to view the dashboard.</p>;
  }

  if (loading) {
    return <p>Loading products...</p>;
  }

  return (
    <DashboardContainer>
      <Header>Product Dashboard</Header>

      {successMessage && <Alert type="success">{successMessage}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <SectionTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</SectionTitle>
      <ProductForm
        onSubmit={handleProductFormSubmit}
        initialData={editingProduct || undefined}
        onCancel={() => setEditingProduct(null)}
      />

      <SectionTitle>All Products</SectionTitle>
      {products.length === 0 ? (
        <p>No products found. Add some!</p>
      ) : (
        <ProductList>
          {products.map((product) => (
            <ProductCard key={product.id} isActive={product.isActive}>
              <ProductStatus isActive={product.isActive}>
                {product.isActive ? 'Active' : 'Inactive'}
              </ProductStatus>
              <ProductName>{product.name}</ProductName>
              <ProductPrice>${product.price.toFixed(2)}</ProductPrice>
              {product.description && <ProductDescription>{product.description}</ProductDescription>}
              {product.user && <ProductOwner>Owner: {product.user.email}</ProductOwner>}
              <ButtonGroup>
                {/* Allow edit/delete if admin OR owner */}
                {(role === 'admin' || product.userId === currentUserId) && (
                  <>
                    <EditButton onClick={() => setEditingProduct(product)}>Edit</EditButton>
                    <DeleteButton onClick={() => handleDeleteProduct(product.id)}>Delete</DeleteButton>
                  </>
                )}
              </ButtonGroup>
            </ProductCard>
          ))}
        </ProductList>
      )}
    </DashboardContainer>
  );
};

export default DashboardPage;
```