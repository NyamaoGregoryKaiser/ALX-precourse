```javascript
/**
 * A higher-order function to wrap asynchronous route handlers.
 * It catches any errors thrown by the async function and passes them to Express's next middleware.
 * This eliminates the need for try-catch blocks in every async route handler.
 * @param {Function} fn - The asynchronous function to wrap.
 * @returns {Function} - An Express middleware function.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
```