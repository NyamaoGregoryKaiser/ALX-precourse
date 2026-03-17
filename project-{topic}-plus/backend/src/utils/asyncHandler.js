```javascript
/**
 * A wrapper for async route handlers to catch errors and pass them to the error handling middleware.
 * This avoids needing try-catch blocks in every async controller function.
 *
 * @param {function} fn - The asynchronous function (e.g., an Express controller).
 * @returns {function} An Express middleware function.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
```