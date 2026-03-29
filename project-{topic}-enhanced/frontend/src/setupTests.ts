```typescript
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import 'whatwg-fetch'; // Polyfill fetch API for Jest environment if needed

// Mock the localStorage
const localStorageMock = (function () {
  let store: { [key: string]: string } = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock react-router-dom navigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
    React.createElement('a', { href: to }, children), // Render Link as a simple anchor for testing
}));

// Mock AuthContext for tests where it's not the primary focus
jest.mock('./context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true, // Default to authenticated for many tests
    role: 'user', // Default role
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';
```