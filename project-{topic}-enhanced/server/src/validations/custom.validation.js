const Joi = require('joi');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/) && !Joi.string().guid({ version: 'uuidv4' }).validate(value).error) {
    return helpers.message('"{{#label}}" must be a valid mongo id or UUID');
  }
  return value;
};

const password = (value, helpers) => {
  if (value.length < 8) {
    return helpers.message('password must be at least 8 characters');
  }
  if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    return helpers.message('password must contain at least 1 letter and 1 number');
  }
  return value;
};

const uuid = (value, helpers) => {
  if (!Joi.string().guid({ version: 'uuidv4' }).validate(value).error) {
    return helpers.message('"{{#label}}" must be a valid UUID v4');
  }
  return value;
};

module.exports = {
  objectId, // Keeping for backward compatibility if ever need to switch DB
  password,
  uuid,
};