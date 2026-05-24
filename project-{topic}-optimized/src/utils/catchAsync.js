/**
 * Higher-order function to wrap async route handlers for error handling.
 * Catches any errors thrown by the async function and passes them to the next middleware (error handler).
 * @param {Function} fn - An async Express route handler function (req, res, next).
 * @returns {Function} A new function that executes the original async function and catches errors.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

export default catchAsync;
```

```javascript