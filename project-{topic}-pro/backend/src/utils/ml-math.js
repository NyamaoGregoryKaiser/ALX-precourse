const AppError = require('./appError');

/**
 * Validates if the input data is an array of objects and contains the specified column.
 * @param {Array<Object>} data - The input array of objects.
 * @param {string} column - The column name to check for.
 * @throws {AppError} If validation fails.
 */
function validateInputData(data, column = null) {
  if (!Array.isArray(data)) {
    throw new AppError('Input data must be an array.', 400);
  }
  if (data.length === 0) {
    throw new AppError('Input data array cannot be empty.', 400);
  }
  if (!data.every(item => typeof item === 'object' && item !== null)) {
    throw new AppError('All items in the input data array must be objects.', 400);
  }
  if (column && !data.every(item => Object.prototype.hasOwnProperty.call(item, column))) {
    throw new AppError(`Input data objects must contain the '${column}' column.`, 400);
  }
}

/**
 * Validates numerical input for ML functions.
 * @param {Array<Object>} data - The input data.
 * @param {string} column - The column to validate.
 * @returns {Array<number>} An array of numerical values from the specified column.
 * @throws {AppError} If validation fails.
 */
function validateNumericalColumn(data, column) {
  validateInputData(data, column);
  const values = data.map(item => item[column]);
  if (!values.every(val => typeof val === 'number' && !isNaN(val))) {
    throw new AppError(`Column '${column}' must contain only numerical values.`, 400);
  }
  return values;
}

// --- Data Preprocessing Utilities ---

/**
 * Applies Min-Max Scaling to a specified numerical column in a dataset.
 * Formula: (x - min) / (max - min)
 * @param {Object} input - An object containing the data and column.
 * @param {Array<Object>} input.data - The input dataset as an array of objects.
 * @param {string} parameters.column - The name of the numerical column to scale.
 * @returns {Object} An object with the scaled data.
 * @throws {AppError} If input data is invalid.
 */
exports.min_max_scaling = (input, parameters) => {
  const { data } = input;
  const { column } = parameters;

  if (!column) throw new AppError('Parameter "column" is required for min-max scaling.', 400);

  const values = validateNumericalColumn(data, column);

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  if (minVal === maxVal) {
    // If all values are the same, scaled value is 0 (or 1 depending on convention)
    // Here we'll map to 0 to avoid division by zero
    return {
      scaled_data: data.map(item => ({ ...item, [column]: 0 })),
      min: minVal,
      max: maxVal
    };
  }

  const scaledData = data.map(item => ({
    ...item,
    [column]: (item[column] - minVal) / (maxVal - minVal),
  }));

  return { scaled_data: scaledData, min: minVal, max: maxVal };
};

/**
 * Applies Standardization (Z-score scaling) to a specified numerical column.
 * Formula: (x - mean) / std_dev
 * @param {Object} input - An object containing the data and column.
 * @param {Array<Object>} input.data - The input dataset as an array of objects.
 * @param {string} parameters.column - The name of the numerical column to standardize.
 * @returns {Object} An object with the standardized data.
 * @throws {AppError} If input data is invalid.
 */
exports.standardization = (input, parameters) => {
  const { data } = input;
  const { column } = parameters;

  if (!column) throw new AppError('Parameter "column" is required for standardization.', 400);

  const values = validateNumericalColumn(data, column);

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    // If all values are the same, standardized value is 0
    return {
      standardized_data: data.map(item => ({ ...item, [column]: 0 })),
      mean: mean,
      std_dev: stdDev
    };
  }

  const standardizedData = data.map(item => ({
    ...item,
    [column]: (item[column] - mean) / stdDev,
  }));

  return { standardized_data: standardizedData, mean: mean, std_dev: stdDev };
};

/**
 * Applies One-Hot Encoding to a specified categorical column.
 * Creates new binary columns for each unique category.
 * @param {Object} input - An object containing the data and column.
 * @param {Array<Object>} input.data - The input dataset as an array of objects.
 * @param {string} parameters.column - The name of the categorical column to encode.
 * @returns {Object} An object with the one-hot encoded data and the mapping.
 * @throws {AppError} If input data is invalid.
 */
exports.one_hot_encoding = (input, parameters) => {
  const { data } = input;
  const { column } = parameters;

  if (!column) throw new AppError('Parameter "column" is required for one-hot encoding.', 400);
  validateInputData(data, column);

  const uniqueCategories = [...new Set(data.map(item => item[column]))];

  const encodedData = data.map(item => {
    const newItem = { ...item };
    uniqueCategories.forEach(category => {
      newItem[`${column}_${category}`] = item[column] === category ? 1 : 0;
    });
    delete newItem[column]; // Remove original column
    return newItem;
  });

  return { encoded_data: encodedData, categories: uniqueCategories };
};

/**
 * Applies Label Encoding to a specified categorical column.
 * Assigns a unique integer to each unique category.
 * @param {Object} input - An object containing the data and column.
 * @param {Array<Object>} input.data - The input dataset as an array of objects.
 * @param {string} parameters.column - The name of the categorical column to encode.
 * @returns {Object} An object with the label encoded data and the mapping.
 * @throws {AppError} If input data is invalid.
 */
exports.label_encoding = (input, parameters) => {
  const { data } = input;
  const { column } = parameters;

  if (!column) throw new AppError('Parameter "column" is required for label encoding.', 400);
  validateInputData(data, column);

  const uniqueCategories = [...new Set(data.map(item => item[column]))].sort(); // Sort for consistent mapping
  const categoryMap = new Map(uniqueCategories.map((category, index) => [category, index]));

  const encodedData = data.map(item => ({
    ...item,
    [column]: categoryMap.get(item[column]),
  }));

  return { encoded_data: encodedData, mapping: Object.fromEntries(categoryMap) };
};

/**
 * Imputes missing values in a specified column using a given strategy.
 * @param {Object} input - An object containing the data and column.
 * @param {Array<Object>} input.data - The input dataset as an array of objects.
 * @param {Object} parameters - Parameters for imputation.
 * @param {string} parameters.column - The name of the column to impute.
 * @param {string} parameters.strategy - Imputation strategy: 'mean', 'median', 'mode'.
 * @returns {Object} An object with the imputed data.
 * @throws {AppError} If input data or parameters are invalid.
 */
exports.missing_value_imputation = (input, parameters) => {
  const { data } = input;
  const { column, strategy } = parameters;

  if (!column || !strategy) throw new AppError('Parameters "column" and "strategy" are required for imputation.', 400);
  if (!['mean', 'median', 'mode'].includes(strategy)) throw new AppError('Invalid imputation strategy. Must be "mean", "median", or "mode".', 400);
  validateInputData(data, column);

  const nonMissingValues = data
    .filter(item => Object.prototype.hasOwnProperty.call(item, column) && item[column] !== null && item[column] !== undefined && (typeof item[column] === 'number' || typeof item[column] === 'string'))
    .map(item => item[column]);

  if (nonMissingValues.length === 0) {
    throw new AppError(`No non-missing values found in column '${column}' to apply imputation strategy.`, 400);
  }

  let imputationValue;

  if (strategy === 'mean') {
    const numValues = nonMissingValues.filter(val => typeof val === 'number');
    if (numValues.length === 0) throw new AppError(`Cannot calculate mean for column '${column}' as it contains no numerical values.`, 400);
    imputationValue = numValues.reduce((sum, val) => sum + val, 0) / numValues.length;
  } else if (strategy === 'median') {
    const numValues = nonMissingValues.filter(val => typeof val === 'number').sort((a, b) => a - b);
    if (numValues.length === 0) throw new AppError(`Cannot calculate median for column '${column}' as it contains no numerical values.`, 400);
    const mid = Math.floor(numValues.length / 2);
    imputationValue = numValues.length % 2 === 0 ? (numValues[mid - 1] + numValues[mid]) / 2 : numValues[mid];
  } else if (strategy === 'mode') {
    const frequencyMap = new Map();
    nonMissingValues.forEach(val => {
      frequencyMap.set(val, (frequencyMap.get(val) || 0) + 1);
    });
    let maxFreq = 0;
    imputationValue = nonMissingValues[0]; // Default to first non-missing value
    for (const [val, freq] of frequencyMap.entries()) {
      if (freq > maxFreq) {
        maxFreq = freq;
        imputationValue = val;
      }
    }
  }

  const imputedData = data.map(item => {
    if (item[column] === null || item[column] === undefined) {
      return { ...item, [column]: imputationValue };
    }
    return item;
  });

  return { imputed_data: imputedData, imputation_value: imputationValue, strategy };
};

// --- Model Evaluation Metrics ---

/**
 * Validates y_true and y_pred arrays for metrics.
 * @param {Object} input - Object containing y_true and y_pred.
 * @returns {Object} { y_true: Array, y_pred: Array }
 * @throws {AppError} If validation fails.
 */
function validateMetricsInput(input) {
  const { y_true, y_pred } = input;

  if (!Array.isArray(y_true) || !Array.isArray(y_pred)) {
    throw new AppError('y_true and y_pred must be arrays.', 400);
  }
  if (y_true.length === 0 || y_pred.length === 0) {
    throw new AppError('y_true and y_pred arrays cannot be empty.', 400);
  }
  if (y_true.length !== y_pred.length) {
    throw new AppError('y_true and y_pred must have the same length.', 400);
  }
  return { y_true, y_pred };
}

/**
 * Calculates the Accuracy Score for classification.
 * @param {Object} input - Object containing y_true and y_pred.
 * @param {Array<number|string>} input.y_true - True labels.
 * @param {Array<number|string>} input.y_pred - Predicted labels.
 * @returns {Object} Accuracy score.
 * @throws {AppError} If input is invalid.
 */
exports.accuracy_score = (input) => {
  const { y_true, y_pred } = validateMetricsInput(input);
  let correct = 0;
  for (let i = 0; i < y_true.length; i++) {
    if (y_true[i] === y_pred[i]) {
      correct++;
    }
  }
  return { score: correct / y_true.length };
};

/**
 * Calculates Precision for a given positive class.
 * (TP / (TP + FP))
 * @param {Object} input - Object containing y_true, y_pred.
 * @param {Object} parameters - Object containing pos_label.
 * @param {number|string} parameters.pos_label - The positive class label.
 * @returns {Object} Precision score.
 * @throws {AppError} If input is invalid.
 */
exports.precision_score = (input, parameters) => {
  const { y_true, y_pred } = validateMetricsInput(input);
  const { pos_label } = parameters;

  if (pos_label === undefined) throw new AppError('Parameter "pos_label" is required for precision calculation.', 400);

  let truePositives = 0;
  let falsePositives = 0;

  for (let i = 0; i < y_true.length; i++) {
    if (y_pred[i] === pos_label) {
      if (y_true[i] === pos_label) {
        truePositives++;
      } else {
        falsePositives++;
      }
    }
  }

  if (truePositives + falsePositives === 0) {
    return { score: 0 }; // Handle division by zero if no positive predictions
  }
  return { score: truePositives / (truePositives + falsePositives) };
};

/**
 * Calculates Recall for a given positive class.
 * (TP / (TP + FN))
 * @param {Object} input - Object containing y_true, y_pred.
 * @param {Object} parameters - Object containing pos_label.
 * @param {number|string} parameters.pos_label - The positive class label.
 * @returns {Object} Recall score.
 * @throws {AppError} If input is invalid.
 */
exports.recall_score = (input, parameters) => {
  const { y_true, y_pred } = validateMetricsInput(input);
  const { pos_label } = parameters;

  if (pos_label === undefined) throw new AppError('Parameter "pos_label" is required for recall calculation.', 400);

  let truePositives = 0;
  let falseNegatives = 0;

  for (let i = 0; i < y_true.length; i++) {
    if (y_true[i] === pos_label) {
      if (y_pred[i] === pos_label) {
        truePositives++;
      } else {
        falseNegatives++;
      }
    }
  }

  if (truePositives + falseNegatives === 0) {
    return { score: 0 }; // Handle division by zero if no actual positives
  }
  return { score: truePositives / (truePositives + falseNegatives) };
};

/**
 * Calculates F1 Score for a given positive class.
 * Formula: 2 * (Precision * Recall) / (Precision + Recall)
 * @param {Object} input - Object containing y_true, y_pred.
 * @param {Object} parameters - Object containing pos_label.
 * @param {number|string} parameters.pos_label - The positive class label.
 * @returns {Object} F1 score.
 * @throws {AppError} If input is invalid.
 */
exports.f1_score = (input, parameters) => {
  const precisionResult = exports.precision_score(input, parameters);
  const recallResult = exports.recall_score(input, parameters);

  const precision = precisionResult.score;
  const recall = recallResult.score;

  if (precision + recall === 0) {
    return { score: 0 }; // Handle division by zero
  }
  return { score: 2 * (precision * recall) / (precision + recall) };
};

/**
 * Calculates Mean Squared Error (MSE) for regression.
 * Formula: (1/n) * sum((y_true - y_pred)^2)
 * @param {Object} input - Object containing y_true and y_pred.
 * @param {Array<number>} input.y_true - True numerical values.
 * @param {Array<number>} input.y_pred - Predicted numerical values.
 * @returns {Object} MSE score.
 * @throws {AppError} If input is invalid.
 */
exports.mse = (input) => {
  const { y_true, y_pred } = validateMetricsInput(input);

  if (!y_true.every(val => typeof val === 'number') || !y_pred.every(val => typeof val === 'number')) {
    throw new AppError('y_true and y_pred must contain only numerical values for MSE.', 400);
  }

  let sumSquaredErrors = 0;
  for (let i = 0; i < y_true.length; i++) {
    sumSquaredErrors += Math.pow(y_true[i] - y_pred[i], 2);
  }
  return { score: sumSquaredErrors / y_true.length };
};

/**
 * Calculates Root Mean Squared Error (RMSE) for regression.
 * Formula: sqrt(MSE)
 * @param {Object} input - Object containing y_true and y_pred.
 * @param {Array<number>} input.y_true - True numerical values.
 * @param {Array<number>} input.y_pred - Predicted numerical values.
 * @returns {Object} RMSE score.
 * @throws {AppError} If input is invalid.
 */
exports.rmse = (input) => {
  const mseResult = exports.mse(input);
  return { score: Math.sqrt(mseResult.score) };
};

/**
 * Calculates Mean Absolute Error (MAE) for regression.
 * Formula: (1/n) * sum(|y_true - y_pred|)
 * @param {Object} input - Object containing y_true and y_pred.
 * @param {Array<number>} input.y_true - True numerical values.
 * @param {Array<number>} input.y_pred - Predicted numerical values.
 * @returns {Object} MAE score.
 * @throws {AppError} If input is invalid.
 */
exports.mae = (input) => {
  const { y_true, y_pred } = validateMetricsInput(input);

  if (!y_true.every(val => typeof val === 'number') || !y_pred.every(val => typeof val === 'number')) {
    throw new AppError('y_true and y_pred must contain only numerical values for MAE.', 400);
  }

  let sumAbsoluteErrors = 0;
  for (let i = 0; i < y_true.length; i++) {
    sumAbsoluteErrors += Math.abs(y_true[i] - y_pred[i]);
  }
  return { score: sumAbsoluteErrors / y_true.length };
};