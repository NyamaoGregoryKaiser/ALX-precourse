const Joi = require('joi');
const { ApiError } = require('../../middlewares/errorMiddleware');
const httpStatus = require('http-status');

const selectorSchema = Joi.object({
  item: Joi.string().required(),
  fields: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(
      Joi.string(), // e.g., 'h2'
      Joi.object({
        selector: Joi.string().required(),
        attr: Joi.string().optional(), // e.g., 'a.title', { selector: 'a', attr: 'href' }
      })
    )
  ).min(1).required(),
});

const createScraperSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
  start_url: Joi.string().uri().required(),
  selectors_json: Joi.string().custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      const { error } = selectorSchema.validate(parsed);
      if (error) {
        return helpers.error('any.invalid', { message: `Invalid selectors_json format: ${error.details[0].message}` });
      }
      return value;
    } catch (e) {
      return helpers.error('any.invalid', { message: 'selectors_json must be a valid JSON string' });
    }
  }).required(),
  schedule_cron: Joi.string().allow('').optional().messages({
    'string.base': 'Schedule cron must be a string',
  }), // Basic validation, more advanced cron validation could be added
  is_active: Joi.boolean().optional(),
  scraping_method: Joi.string().valid('cheerio', 'puppeteer').optional().default('cheerio'),
});

const updateScraperSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).allow('').optional(),
  start_url: Joi.string().uri().optional(),
  selectors_json: Joi.string().custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      const { error } = selectorSchema.validate(parsed);
      if (error) {
        return helpers.error('any.invalid', { message: `Invalid selectors_json format: ${error.details[0].message}` });
      }
      return value;
    } catch (e) {
      return helpers.error('any.invalid', { message: 'selectors_json must be a valid JSON string' });
    }
  }).optional(),
  schedule_cron: Joi.string().allow('').optional(),
  is_active: Joi.boolean().optional(),
  scraping_method: Joi.string().valid('cheerio', 'puppeteer').optional(),
}).min(1); // At least one field is required for update

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }
  next();
};

module.exports = {
  validateCreateScraper: validate(createScraperSchema),
  validateUpdateScraper: validate(updateScraperSchema),
};