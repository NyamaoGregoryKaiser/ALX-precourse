```javascript
/**
 * A wrapper to simplify async/await error handling in Express route handlers.
 * Catches errors from async functions and passes them to the next middleware (error handler).
 * @param {function} fn - The asynchronous route handler function.
 * @returns {function} An Express middleware function.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
```