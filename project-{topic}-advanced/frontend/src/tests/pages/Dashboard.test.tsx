```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';
import * as dashboardApi from '../../api/dashboard';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Mock the API calls
jest.mock('../../api/dashboard', () => ({
  getGlobalDashboardSummary: jest.fn(),
}));

// Mock the AuthContext values
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

const mockAuthContext = {
  user: { id: 'user1', username: 'testuser', email: 'test@example.com', roles: ['user'] },
  isAuthenticated: true,
  loading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  fetchUser: jest.fn(),
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue(mockAuthContext);
    (dashboardApi.getGlobalDashboardSummary as jest.Mock).mockClear();
  });

  it('renders loading state initially', () => {
    (dashboardApi.getGlobalDashboardSummary as jest.Mock).mockReturnValue(new Promise(() => {})); // Keep it pending
    render(
      <Router>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </Router>
    );
    expect(screen.getByText(/Loading dashboard.../i)).toBeInTheDocument();
  });

  it('renders error message if fetching summary fails', async () => {
    const errorMessage = 'Failed to fetch summary';
    (dashboardApi.getGlobalDashboardSummary as jest.Mock).mockRejectedValueOnce({ response: { data: { message: errorMessage } } });

    render(
      <Router>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('renders "no services yet" message if summary is empty', async () => {
    (dashboardApi.getGlobalDashboardSummary as jest.Mock).mockResolvedValueOnce([]);

    render(
      <Router>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByText(/You haven't added any services yet./i)).toBeInTheDocument();
      expect(screen.getByText(/Go to the Services page to add your first service!/i)).toBeInTheDocument();
    });
  });

  it('renders service cards when summary data is available', async () => {
    const mockServices = [
      {
        id: 'service1',
        name: 'Service A',
        description: 'Description A',
        metricCount: 2,
        metricsSummary: [
          { metricName: 'latency', latestValue: 100, unit: 'ms' },
          { metricName: 'errors', latestValue: 5, unit: '%' },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'service2',
        name: 'Service B',
        description: 'Description B',
        metricCount: 1,
        metricsSummary: [{ metricName: 'throughput', latestValue: 500, unit: 'req/s' }],
        createdAt: new Date().toISOString(),
      },
    ];
    (dashboardApi.getGlobalDashboardSummary as jest.Mock).mockResolvedValueOnce(mockServices);

    render(
      <Router>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </Router>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /My Services Dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Service A/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Service B/i })).toBeInTheDocument();
      expect(screen.getByText(/Latest Value: 100.00 ms/i)).toBeInTheDocument();
      expect(screen.getByText(/Latest Value: 500.00 req\/s/i)).toBeInTheDocument();
    });
  });
});
```