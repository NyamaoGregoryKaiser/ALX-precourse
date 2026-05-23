import { normalizeColumn, standardizeColumn, oneHotEncodeColumn } from '../../src/modules/preprocessing/services/preprocessingService';
import logger from '../../src/utils/logger';

// Mock logger to prevent actual logging during tests
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('PreprocessingService Unit Tests', () => {
  const mockData = [
    { id: 1, value: '10', category: 'A' },
    { id: 2, value: '20', category: 'B' },
    { id: 3, value: '30', category: 'A' },
    { id: 4, value: '40', category: 'C' },
    { id: 5, value: null, category: 'B' }, // Test with null value
    { id: 6, value: 'invalid', category: 'D' }, // Test with invalid numerical value
  ];

  describe('normalizeColumn', () => {
    it('should normalize a numerical column to [0, 1]', () => {
      const normalizedData = normalizeColumn(mockData, 'value');

      expect(normalizedData).toHaveLength(mockData.length);
      expect(normalizedData[0].value_normalized).toBeCloseTo(0);
      expect(normalizedData[1].value_normalized).toBeCloseTo(0.3333);
      expect(normalizedData[2].value_normalized).toBeCloseTo(0.6667);
      expect(normalizedData[3].value_normalized).toBeCloseTo(1);
      expect(normalizedData[4].value_normalized).toBeNull(); // null should remain null or similar
      expect(normalizedData[5].value_normalized).toBeNull(); // invalid should remain null or similar
    });

    it('should handle cases where min equals max', () => {
      const singleValueData = [
        { id: 1, value: '10' },
        { id: 2, value: '10' },
        { id: 3, value: '10' },
      ];
      const normalizedData = normalizeColumn(singleValueData, 'value');
      expect(normalizedData[0].value_normalized).toBeCloseTo(1); // or 0, depending on implementation detail for edge case
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Min and Max values are identical'));
    });

    it('should return original data if column does not exist', () => {
      const result = normalizeColumn(mockData, 'nonExistent');
      expect(result).toEqual(mockData);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No valid numerical values found'));
    });

    it('should return original data if all values are non-numerical', () => {
      const nonNumericalData = [
        { id: 1, value: 'abc' },
        { id: 2, value: 'def' },
      ];
      const result = normalizeColumn(nonNumericalData, 'value');
      expect(result).toEqual(nonNumericalData);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No valid numerical values found'));
    });
  });

  describe('standardizeColumn', () => {
    it('should standardize a numerical column to mean 0, std dev 1', () => {
      const data = [
        { id: 1, value: 10 },
        { id: 2, value: 20 },
        { id: 3, value: 30 },
        { id: 4, value: 40 },
      ]; // mean = 25, std dev = sqrt(((10-25)^2 + (20-25)^2 + (30-25)^2 + (40-25)^2)/4) = sqrt((225+25+25+225)/4) = sqrt(500/4) = sqrt(125) = 11.18

      const standardizedData = standardizeColumn(data, 'value');

      const standardizedValues = standardizedData.map((d: any) => d.value_standardized).filter(v => v !== null);
      const mean = standardizedValues.reduce((sum: number, val: number) => sum + val, 0) / standardizedValues.length;
      const stdDev = Math.sqrt(
        standardizedValues.map((val: number) => Math.pow(val - mean, 2)).reduce((sum: number, val: number) => sum + val, 0) / standardizedValues.length,
      );

      expect(mean).toBeCloseTo(0);
      expect(stdDev).toBeCloseTo(1);
      expect(standardizedData[0].value_standardized).toBeCloseTo((10 - 25) / Math.sqrt(125));
      expect(standardizedData[3].value_standardized).toBeCloseTo((40 - 25) / Math.sqrt(125));
      expect(standardizedData[0].value_standardized).toBeCloseTo(-1.3416);
      expect(standardizedData[1].value_standardized).toBeCloseTo(-0.4472);
      expect(standardizedData[2].value_standardized).toBeCloseTo(0.4472);
      expect(standardizedData[3].value_standardized).toBeCloseTo(1.3416);
    });

    it('should handle cases where standard deviation is zero', () => {
      const singleValueData = [
        { id: 1, value: '10' },
        { id: 2, value: '10' },
        { id: 3, value: '10' },
      ];
      const standardizedData = standardizeColumn(singleValueData, 'value');
      expect(standardizedData[0].value_standardized).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Standard deviation is zero'));
    });
  });

  describe('oneHotEncodeColumn', () => {
    it('should perform one-hot encoding on a categorical column', () => {
      const encodedData = oneHotEncodeColumn(mockData, 'category');

      expect(encodedData).toHaveLength(mockData.length);
      expect(Object.keys(encodedData[0])).toContain('category_A');
      expect(Object.keys(encodedData[0])).toContain('category_B');
      expect(Object.keys(encodedData[0])).toContain('category_C');
      expect(Object.keys(encodedData[0])).toContain('category_D'); // Include D even if only one instance

      expect(encodedData[0].category_A).toBe(1);
      expect(encodedData[0].category_B).toBe(0);

      expect(encodedData[1].category_A).toBe(0);
      expect(encodedData[1].category_B).toBe(1);

      expect(encodedData[5].category_D).toBe(1);
    });

    it('should handle empty categories gracefully', () => {
      const dataWithEmptyCategories = [
        { id: 1, category: 'A' },
        { id: 2, category: '' },
        { id: 3, category: null },
        { id: 4, category: undefined },
      ];
      const encodedData = oneHotEncodeColumn(dataWithEmptyCategories, 'category');
      expect(Object.keys(encodedData[0])).toContain('category_A');
      expect(Object.keys(encodedData[0])).not.toContain('category_'); // Empty string not encoded
      expect(Object.keys(encodedData[0])).not.toContain('category_null');
      expect(Object.keys(encodedData[0])).not.toContain('category_undefined');
      expect(encodedData[0].category_A).toBe(1);
      expect(encodedData[1].category_A).toBe(0);
    });

    it('should warn for high cardinality columns', () => {
      const highCardinalityData = Array.from({ length: 150 }, (_, i) => ({ id: i, category: `Cat${i}` }));
      oneHotEncodeColumn(highCardinalityData, 'category');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('High cardinality (150)'));
    });
  });
});
```