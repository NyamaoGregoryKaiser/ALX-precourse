const Joi = require('joi');

const validMLTaskTypes = [
  'min_max_scaling',
  'standardization',
  'one_hot_encoding',
  'label_encoding',
  'missing_value_imputation',
  'accuracy_score',
  'precision_score',
  'recall_score',
  'f1_score',
  'mse',
  'rmse',
  'mae',
];

const createMLTaskSchema = Joi.object({
  type: Joi.string().valid(...validMLTaskTypes).required(),
  inputData: Joi.object().required().description('JSON object representing the input data. Format depends on task type.'),
  parameters: Joi.object().optional().description('JSON object representing parameters for the task. Format depends on task type.'),
});

module.exports = {
  createMLTaskSchema,
  validMLTaskTypes,
};