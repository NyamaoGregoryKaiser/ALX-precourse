```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Navbar from '../../components/Navbar';

describe('Navbar Component', () => {
    test('renders login/register link when not authenticated', () => {
        render(
            <Router>
                <Navbar isAuthenticated={false} onLogout={() => {}} />
            </Router>
        );
        expect(screen.getByText(/Login \/ Register/i)).toBeInTheDocument();
        expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Logout/i)).not.toBeInTheDocument();
    });

    test('renders dashboard and logout links when authenticated', () => {
        render(
            <Router>
                <Navbar isAuthenticated={true} onLogout={() => {}} />
            </Router>
        );
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Logout/i)).toBeInTheDocument();
        expect(screen.queryByText(/Login \/ Register/i)).not.toBeInTheDocument();
    });

    test('calls onLogout prop when logout button is clicked', () => {
        const mockOnLogout = jest.fn();
        render(
            <Router>
                <Navbar isAuthenticated={true} onLogout={mockOnLogout} />
            </Router>
        );

        fireEvent.click(screen.getByText(/Logout/i));
        expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    test('renders app title and links correctly', () => {
        render(
            <Router>
                <Navbar isAuthenticated={false} onLogout={() => {}} />
            </Router>
        );
        expect(screen.getByText(/Scraping Tool/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Scraping Tool/i })).toHaveAttribute('href', '/');
    });
});
```