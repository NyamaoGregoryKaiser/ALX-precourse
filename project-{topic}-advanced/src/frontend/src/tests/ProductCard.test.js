```javascript
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

describe('ProductCard Component', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    description: 'This is a description of the test product.',
    price: 19.99,
    quantity: 50,
    imageUrl: 'https://via.placeholder.com/400x300',
  };

  it('renders product details correctly', () => {
    render(
      <Router>
        <ProductCard product={mockProduct} />
      </Router>
    );

    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.description)).toBeInTheDocument();
    expect(screen.getByText(`$${mockProduct.price.toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText(`Qty: ${mockProduct.quantity}`)).toBeInTheDocument();
    expect(screen.getByAltText(mockProduct.name)).toHaveAttribute('src', mockProduct.imageUrl);
  });

  it('renders default image if imageUrl is not provided', () => {
    const productWithoutImage = { ...mockProduct, imageUrl: null };
    render(
      <Router>
        <ProductCard product={productWithoutImage} />
      </Router>
    );

    expect(screen.getByAltText(productWithoutImage.name)).toHaveAttribute(
      'src',
      'https://via.placeholder.com/400x300?text=No+Image'
    );
  });

  it('links to the product detail page', () => {
    render(
      <Router>
        <ProductCard product={mockProduct} />
      </Router>
    );

    const linkElement = screen.getByRole('link', { name: /test product/i });
    expect(linkElement).toHaveAttribute('href', `/products/${mockProduct.id}`);
  });
});
```