import logger from '../../../utils/logger';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

export const convertArrayOfObjectsToCsv = (data: any[]): string => {
  if (!data || data.length === 0) {
    return '';
  }

  const columns = Object.keys(data[0]);
  return stringify(data, { header: true, columns });
};

/**
 * Normalizes a numerical column to a [0, 1] range (Min-Max Normalization).
 *
 * @param data Array of objects (CSV rows).
 * @param columnName The name of the column to normalize.
 * @returns Transformed data array.
 */
export const normalizeColumn = (data: any[], columnName: string): any[] => {
  logger.debug(`Normalizing column: ${columnName}`);
  const values: number[] = data
    .map((row) => parseFloat(row[columnName]))
    .filter((value) => !isNaN(value));

  if (values.length === 0) {
    logger.warn(`No valid numerical values found in column '${columnName}' for normalization.`);
    return data; // Return original data if no numerical values
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    logger.warn(`Min and Max values are identical in column '${columnName}'. Cannot normalize.`);
    return data.map((row) => ({
      ...row,
      [`${columnName}_normalized`]: parseFloat(row[columnName]) / min // Avoid division by zero if min is 0
    }));
  }

  return data.map((row) => {
    const value = parseFloat(row[columnName]);
    if (isNaN(value)) {
      return { ...row, [`${columnName}_normalized`]: null }; // Handle non-numerical values
    }
    return {
      ...row,
      [`${columnName}_normalized`]: (value - min) / (max - min),
    };
  });
};

/**
 * Standardizes a numerical column to have a mean of 0 and standard deviation of 1 (Z-score Standardization).
 *
 * @param data Array of objects (CSV rows).
 * @param columnName The name of the column to standardize.
 * @returns Transformed data array.
 */
export const standardizeColumn = (data: any[], columnName: string): any[] => {
  logger.debug(`Standardizing column: ${columnName}`);
  const values: number[] = data
    .map((row) => parseFloat(row[columnName]))
    .filter((value) => !isNaN(value));

  if (values.length === 0) {
    logger.warn(`No valid numerical values found in column '${columnName}' for standardization.`);
    return data;
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = Math.sqrt(
    values.map((val) => Math.pow(val - mean, 2)).reduce((sum, val) => sum + val, 0) / values.length,
  );

  if (stdDev === 0) {
    logger.warn(`Standard deviation is zero in column '${columnName}'. Cannot standardize.`);
    return data.map((row) => ({
      ...row,
      [`${columnName}_standardized`]: 0 // All values are the same, so standardized to 0
    }));
  }

  return data.map((row) => {
    const value = parseFloat(row[columnName]);
    if (isNaN(value)) {
      return { ...row, [`${columnName}_standardized`]: null };
    }
    return {
      ...row,
      [`${columnName}_standardized`]: (value - mean) / stdDev,
    };
  });
};

/**
 * Performs One-Hot Encoding on a categorical column.
 * New columns are created for each unique category.
 *
 * @param data Array of objects (CSV rows).
 * @param columnName The name of the categorical column to encode.
 * @returns Transformed data array with new one-hot encoded columns.
 */
export const oneHotEncodeColumn = (data: any[], columnName: string): any[] => {
  logger.debug(`One-Hot Encoding column: ${columnName}`);
  const uniqueCategories = [...new Set(data.map((row) => row[columnName]))].filter(
    (cat) => cat !== undefined && cat !== null && cat !== '',
  );

  if (uniqueCategories.length === 0) {
    logger.warn(`No valid categories found in column '${columnName}' for one-hot encoding.`);
    return data;
  }
  if (uniqueCategories.length > 100) { // Safety check for high cardinality
    logger.warn(`High cardinality (${uniqueCategories.length}) in column '${columnName}'. One-hot encoding may lead to too many columns.`);
    // Optionally throw an error or handle differently
  }

  return data.map((row) => {
    const newRow: any = { ...row };
    uniqueCategories.forEach((category) => {
      const encodedColName = `${columnName}_${category}`;
      newRow[encodedColName] = row[columnName] === category ? 1 : 0;
    });
    // Optionally remove the original column
    // delete newRow[columnName];
    return newRow;
  });
};
```