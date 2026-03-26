```javascript
const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Validation middleware to validate request against a Joi schema.
 * @param {object} schema - Joi schema object containing validation rules for body, params, query.
 * @returns {Function} - Express middleware function.
 */
const validate = (schema) => (req, res, next) => {
  // Pick validation schemas for req.body, req.params, req.query
  const validSchema = Joi.object().keys(schema);

  // Combine request parts to validate
  const object = {};
  if (schema.params) Object.assign(object, { params: req.params });
  if (schema.query) Object.assign(object, { query: req.query });
  if (schema.body) Object.assign(object, { body: req.body });

  // Validate the combined object
  const { value, error } = validSchema.validate(object, { abortEarly: false, stripUnknown: true }); // stripUnknown removes unknown properties

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }

  // Overwrite request properties with validated and stripped values
  Object.assign(req, value);
  return next();
};

module.exports = validate;
```