```javascript
// src/utils/catchAsync.js
// ALX Principle: Error Handling Wrapper
// A higher-order function to wrap async Express route handlers and catch errors.
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
```