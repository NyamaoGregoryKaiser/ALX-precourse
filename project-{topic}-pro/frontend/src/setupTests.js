```javascript
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock matchMedia for tests that might use it (e.g., responsive components)
window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

// Mock any global dependencies like localStorage if needed for tests
// Object.defineProperty(window, 'localStorage', {
//   value: {
//     getItem: jest.fn(() => null),
//     setItem: jest.fn(() => null),
//     removeItem: jest.fn(() => null),
//   },
//   writable: true,
// });
```