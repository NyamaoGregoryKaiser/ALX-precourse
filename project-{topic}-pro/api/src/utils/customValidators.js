```javascript
const Joi = require('joi');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) { // This regex is for MongoDB ObjectId, for UUID use different regex
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

const uuid = (value, helpers) => {
  // Regex for UUID v4
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!value.match(uuidV4Regex)) {
    return helpers.message('"{{#label}}" must be a valid UUID v4');
  }
  return value;
};

module.exports = {
  objectId,
  uuid, // Export the UUID validator
};
```
(Note: The `objectId` validator is typically for MongoDB. Since we're using UUIDs for PostgreSQL, the `uuid` validator is more relevant. I've included both for completeness, but `uuid` is used in `validation.js`.)