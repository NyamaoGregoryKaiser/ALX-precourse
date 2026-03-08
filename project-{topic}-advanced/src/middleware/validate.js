```javascript
const Joi = require('joi');
const httpStatus = require('http-status-codes');
const pick = require('../utils/pick');
const ApiError = require('../utils/apiError');

/**
 * Middleware for validating request body, params, and query against a Joi schema.
 * @param {Object} schema - Joi schema for validation.
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = pick(schema, ['params', 'query', 'body']);
  const object = pick(req, Object.keys(validSchema));
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }
  Object.assign(req, value);
  return next();
};

module.exports = validate;
```