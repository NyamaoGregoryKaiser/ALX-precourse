```javascript
const Joi = require('joi');
const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');
const logger = require('../../config/logger');

const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

/**
 * Validation middleware to validate request body, query, and params against Joi schemas.
 * @param {object} schema - A Joi schema object containing schemas for body, query, and/or params.
 * @returns {Function} Express middleware function.
 */
const validate = (schema) => catchAsync(async (req, res, next) => {
  const validSchema = pick(schema, ['params', 'query', 'body']);
  const object = pick(req, Object.keys(validSchema));

  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    logger.warn(`Validation Error: ${errorMessage}`);
    return next(new AppError(errorMessage, 400)); // 400 Bad Request
  }

  // Merge validated data back into req object
  Object.assign(req, value);
  return next();
});

module.exports = validate;
```