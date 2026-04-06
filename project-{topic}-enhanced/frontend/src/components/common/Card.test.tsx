```typescript
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card } from './Card';
import { BrowserRouter } from 'react-router-dom'; // Required for Link component if children use it

describe('Card Component', () => {
    it('renders with title, value, and icon', () => {
        render(
            <BrowserRouter>
                <Card title="Test Title" value={123} icon="🚀" />
            </BrowserRouter>
        );

        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('123')).toBeInTheDocument();
        expect(screen.getByText('🚀')).toBeInTheDocument();
    });

    it('renders children content', () => {
        render(
            <BrowserRouter>
                <Card title="Test Title" value={123} icon="🚀">
                    <p data-testid="child-content">This is a child paragraph</p>
                </Card>
            </BrowserRouter>
        );

        expect(screen.getByTestId('child-content')).toBeInTheDocument();
        expect(screen.getByText('This is a child paragraph')).toBeInTheDocument();
    });

    it('applies additional className', () => {
        render(
            <BrowserRouter>
                <Card title="Test Title" value={123} icon="🚀" className="bg-red-100" />
            </BrowserRouter>
        );

        const cardElement = screen.getByText('Test Title').closest('div');
        expect(cardElement).toHaveClass('bg-red-100');
    });

    it('does not render children if not provided', () => {
        render(
            <BrowserRouter>
                <Card title="Test Title" value={123} icon="🚀" />
            </BrowserRouter>
        );

        expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    });
});
```