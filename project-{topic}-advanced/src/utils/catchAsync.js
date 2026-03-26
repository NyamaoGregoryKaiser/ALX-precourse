```javascript
/**
 * Wrapper for async route handlers to catch errors and pass them to the Express error middleware.
 * @param {Function} fn - The async function (controller method) to wrap.
 * @returns {Function} - An Express middleware function.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
```