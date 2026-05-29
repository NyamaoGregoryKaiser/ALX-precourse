```javascript
/**
 * A higher-order function to wrap async Express route handlers.
 * It catches any errors that occur in the async function and passes them to the Express error handling middleware.
 * This prevents the need for repetitive try-catch blocks in every async controller.
 *
 * @param {Function} fn - An async Express route handler (req, res, next).
 * @returns {Function} An Express middleware function.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
```