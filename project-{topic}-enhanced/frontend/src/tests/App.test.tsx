import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext'; // Mock if necessary
import { BrowserRouter as Router } from 'react-router-dom';

// Mock react-toastify as it's not relevant for basic rendering tests
jest.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock AuthProvider to avoid complex authentication logic in basic App test
jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'), // Use actual for other exports
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-auth-provider">{children}</div>
  ),
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <Router>
        <App />
      </Router>
    );
    // Check if Navbar is rendered
    expect(screen.getByText(/TaskFlow/i)).toBeInTheDocument();
    // Check if ToastContainer mock is rendered
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    // In unauthenticated state, it should redirect to login, which means Login component might be rendered
    // or at least the path changes to /login, making "Sign in to your account" appear.
    // For this simple test, we just check for the Nav.
  });

  // Example: Test route rendering for authenticated users
  it('renders Dashboard for authenticated user on root path', () => {
    // Mock useAuth to return an authenticated user
    jest.spyOn(require('../contexts/AuthContext'), 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'user', createdAt: '...', updatedAt: '...' },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <Router>
        <App />
      </Router>
    );
    // The Dashboard component usually has a "Welcome" message.
    expect(screen.getByText(/Welcome, Test!/i)).toBeInTheDocument();
  });
});
```

#### Performance Tests

*   **Tools:**
    *   **JMeter:** Open-source, widely used for load testing web applications.
    *   **k6:** Modern load testing tool, scriptable with JavaScript, good for API-centric testing.
    *   **Locust:** Python-based, distributed load testing tool.
*   **Strategy:**
    1.  **Identify Critical Flows:** User login, project listing, task creation, task status update.
    2.  **Define Load Scenarios:**
        *   **Concurrent Users:** Simulate 100, 500, 1000+ simultaneous users.
        *   **Ramp-up Period:** Gradually increase load to simulate real-world usage.
        *   **Duration:** Run tests for a sufficient period (e.g., 5-30 minutes).
    3.  **Metrics to Monitor:**
        *   **Response Time:** Average, P90, P95, P99 latency.
        *   **Throughput:** Requests per second.
        *   **Error Rate:** Percentage of failed requests.
        *   **Server-Side Metrics:** CPU, memory, network I/O, database connection pool usage, query execution times.
    4.  **Baseline & Regression:** Establish a baseline and run performance tests with each major change to prevent regressions.
    5.  **Caching Impact:** Measure performance with and without caching to demonstrate its benefits.
    6.  **Database Stress:** Monitor database performance during high load, looking for slow queries, deadlocks, and connection exhaustion.

*Example JMeter Test Plan (conceptual outline, not runnable code):*
```
Test Plan
  ├── Thread Group (e.g., 500 users, 5 min ramp-up, loop forever for 30 min)
  │   ├── HTTP Request Defaults (Server: localhost, Port: 5000)
  │   ├── User Defined Variables (for dynamic data, e.g., ${email_counter})
  │   ├── 1. Register User (POST /api/v1/auth/register)
  │   │   └── JSON Extractor (Extract User ID, Token)
  │   ├── 2. Login User (POST /api/v1/auth/login)
  │   │   └── JSON Extractor (Extract Token)
  │   ├── 3. Get All Projects (GET /api/v1/projects)
  │   │   └── JSON Extractor (Extract Project IDs)
  │   ├── 4. Get Project Details (GET /api/v1/projects/${projectId})
  │   ├── 5. Create Task (POST /api/v1/projects/${projectId}/tasks)
  │   ├── 6. Update Task Status (PATCH /api/v1/tasks/${taskId})
  │   ├── Listeners (View Results Tree, Aggregate Report, Graph Results)
```

---

### 7. Documentation

#### `README.md`
```markdown