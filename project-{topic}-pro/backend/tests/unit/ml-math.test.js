const mlMath = require('../../src/utils/ml-math');
const AppError = require('../../src/utils/appError');

describe('ML Math Utilities', () => {
  // --- Input Validation ---
  it('should throw AppError for invalid input data structure', () => {
    expect(() => mlMath.min_max_scaling({ data: 'not_an_array' }, { column: 'a' })).toThrow(AppError);
    expect(() => mlMath.min_max_scaling({ data: [] }, { column: 'a' })).toThrow(AppError);
    expect(() => mlMath.min_max_scaling({ data: [{ a: 1 }, 'not_an_object'] }, { column: 'a' })).toThrow(AppError);
  });

  it('should throw AppError if column is missing in data for numerical ops', () => {
    expect(() => mlMath.min_max_scaling({ data: [{ b: 1 }] }, { column: 'a' })).toThrow(AppError);
  });

  it('should throw AppError if column contains non-numerical values for numerical ops', () => {
    expect(() => mlMath.min_max_scaling({ data: [{ a: 1 }, { a: 'b' }] }, { column: 'a' })).toThrow(AppError);
    expect(() => mlMath.standardization({ data: [{ a: 1 }, { a: NaN }] }, { column: 'a' })).toThrow(AppError);
  });

  // --- Min-Max Scaling ---
  describe('min_max_scaling', () => {
    it('should scale numerical column to [0, 1] range', () => {
      const input = { data: [{ value: 10 }, { value: 20 }, { value: 30 }] };
      const params = { column: 'value' };
      const result = mlMath.min_max_scaling(input, params);
      expect(result.scaled_data).toEqual([{ value: 0 }, { value: 0.5 }, { value: 1 }]);
      expect(result.min).toBe(10);
      expect(result.max).toBe(30);
    });

    it('should handle identical values, scaling to 0', () => {
      const input = { data: [{ value: 10 }, { value: 10 }, { value: 10 }] };
      const params = { column: 'value' };
      const result = mlMath.min_max_scaling(input, params);
      expect(result.scaled_data).toEqual([{ value: 0 }, { value: 0 }, { value: 0 }]);
      expect(result.min).toBe(10);
      expect(result.max).toBe(10);
    });

    it('should throw error if column parameter is missing', () => {
      const input = { data: [{ value: 10 }] };
      expect(() => mlMath.min_max_scaling(input, {})).toThrow(AppError);
      expect(() => mlMath.min_max_scaling(input, {})).toThrow('Parameter "column" is required for min-max scaling.');
    });
  });

  // --- Standardization ---
  describe('standardization', () => {
    it('should standardize numerical column to have mean 0 and std dev 1', () => {
      const input = { data: [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }] };
      const params = { column: 'value' };
      const result = mlMath.standardization(input, params);
      const expectedScaled = [ -1.4142135623730951, -0.7071067811865476, 0, 0.7071067811865476, 1.4142135623730951 ];
      result.standardized_data.forEach((item, i) => {
        expect(item.value).toBeCloseTo(expectedScaled[i]);
      });
      expect(result.mean).toBe(3);
      expect(result.std_dev).toBeCloseTo(1.4142135623730951);
    });

    it('should handle identical values, standardizing to 0', () => {
      const input = { data: [{ value: 10 }, { value: 10 }, { value: 10 }] };
      const params = { column: 'value' };
      const result = mlMath.standardization(input, params);
      expect(result.standardized_data).toEqual([{ value: 0 }, { value: 0 }, { value: 0 }]);
      expect(result.mean).toBe(10);
      expect(result.std_dev).toBe(0);
    });

    it('should throw error if column parameter is missing', () => {
      const input = { data: [{ value: 10 }] };
      expect(() => mlMath.standardization(input, {})).toThrow(AppError);
      expect(() => mlMath.standardization(input, {})).toThrow('Parameter "column" is required for standardization.');
    });
  });

  // --- One-Hot Encoding ---
  describe('one_hot_encoding', () => {
    it('should apply one-hot encoding to a categorical column', () => {
      const input = { data: [{ city: 'NY' }, { city: 'LA' }, { city: 'NY' }, { city: 'SF' }] };
      const params = { column: 'city' };
      const result = mlMath.one_hot_encoding(input, params);
      expect(result.encoded_data).toEqual([
        { city_NY: 1, city_LA: 0, city_SF: 0 },
        { city_NY: 0, city_LA: 1, city_SF: 0 },
        { city_NY: 1, city_LA: 0, city_SF: 0 },
        { city_NY: 0, city_LA: 0, city_SF: 1 },
      ]);
      expect(result.categories).toEqual(['NY', 'LA', 'SF']);
    });

    it('should work with numerical categories', () => {
      const input = { data: [{ id: 1 }, { id: 2 }, { id: 1 }] };
      const params = { column: 'id' };
      const result = mlMath.one_hot_encoding(input, params);
      expect(result.encoded_data).toEqual([
        { id_1: 1, id_2: 0 },
        { id_1: 0, id_2: 1 },
        { id_1: 1, id_2: 0 },
      ]);
    });

    it('should throw error if column parameter is missing', () => {
      const input = { data: [{ city: 'NY' }] };
      expect(() => mlMath.one_hot_encoding(input, {})).toThrow(AppError);
      expect(() => mlMath.one_hot_encoding(input, {})).toThrow('Parameter "column" is required for one-hot encoding.');
    });
  });

  // --- Label Encoding ---
  describe('label_encoding', () => {
    it('should apply label encoding to a categorical column', () => {
      const input = { data: [{ color: 'red' }, { color: 'blue' }, { color: 'red' }, { color: 'green' }] };
      const params = { column: 'color' };
      const result = mlMath.label_encoding(input, params);
      expect(result.encoded_data).toEqual([
        { color: 2 }, // 'red' (sorted alphabetically: blue=0, green=1, red=2)
        { color: 0 }, // 'blue'
        { color: 2 }, // 'red'
        { color: 1 }, // 'green'
      ]);
      expect(result.mapping).toEqual({ 'blue': 0, 'green': 1, 'red': 2 });
    });

    it('should handle mixed-case categories consistently (case-sensitive)', () => {
      const input = { data: [{ item: 'Apple' }, { item: 'apple' }] };
      const params = { column: 'item' };
      const result = mlMath.label_encoding(input, params);
      expect(result.encoded_data).toEqual([
        { item: 0 }, // 'Apple'
        { item: 1 }, // 'apple'
      ]);
      expect(result.mapping).toEqual({ 'Apple': 0, 'apple': 1 });
    });

    it('should throw error if column parameter is missing', () => {
      const input = { data: [{ color: 'red' }] };
      expect(() => mlMath.label_encoding(input, {})).toThrow(AppError);
      expect(() => mlMath.label_encoding(input, {})).toThrow('Parameter "column" is required for label encoding.');
    });
  });

  // --- Missing Value Imputation ---
  describe('missing_value_imputation', () => {
    const dataWithMissing = [
      { id: 1, age: 30, city: 'NY' },
      { id: 2, age: null, city: 'LA' },
      { id: 3, age: 25, city: 'NY' },
      { id: 4, age: undefined, city: 'SF' },
      { id: 5, age: 40, city: null },
      { id: 6, age: 25, city: 'LA' },
    ];

    it('should impute missing numerical values with mean strategy', () => {
      const input = { data: dataWithMissing };
      const parameters = { column: 'age', strategy: 'mean' };
      const result = mlMath.missing_value_imputation(input, parameters);
      const meanAge = (30 + 25 + 40 + 25) / 4; // 120 / 4 = 30
      expect(result.imputation_value).toBe(meanAge);
      expect(result.imputed_data.map(item => item.age)).toEqual([30, meanAge, 25, meanAge, 40, 25]);
    });

    it('should impute missing numerical values with median strategy', () => {
      const input = { data: dataWithMissing };
      const parameters = { column: 'age', strategy: 'median' };
      const result = mlMath.missing_value_imputation(input, parameters);
      const sortedAges = [25, 25, 30, 40]; // Median is (25+30)/2 = 27.5
      expect(result.imputation_value).toBe(27.5);
      expect(result.imputed_data.map(item => item.age)).toEqual([30, 27.5, 25, 27.5, 40, 25]);
    });

    it('should impute missing categorical values with mode strategy', () => {
      const input = { data: dataWithMissing };
      const parameters = { column: 'city', strategy: 'mode' };
      const result = mlMath.missing_value_imputation(input, parameters);
      // Frequencies: NY:2, LA:2, SF:1. Can be either NY or LA. Let's assume NY as it appears first.
      expect(['NY', 'LA']).toContain(result.imputation_value);
      const expectedCities = ['NY', 'LA', 'NY', 'SF', result.imputation_value, 'LA'];
      expect(result.imputed_data.map(item => item.city)).toEqual(expectedCities);
    });

    it('should throw error if column parameter is missing', () => {
      const input = { data: dataWithMissing };
      expect(() => mlMath.missing_value_imputation(input, { strategy: 'mean' })).toThrow(AppError);
      expect(() => mlMath.missing_value_imputation(input, { strategy: 'mean' })).toThrow('Parameters "column" and "strategy" are required for imputation.');
    });

    it('should throw error if strategy parameter is missing', () => {
      const input = { data: dataWithMissing };
      expect(() => mlMath.missing_value_imputation(input, { column: 'age' })).toThrow(AppError);
      expect(() => mlMath.missing_value_imputation(input, { column: 'age' })).toThrow('Parameters "column" and "strategy" are required for imputation.');
    });

    it('should throw error for invalid strategy', () => {
      const input = { data: dataWithMissing };
      expect(() => mlMath.missing_value_imputation(input, { column: 'age', strategy: 'invalid' })).toThrow(AppError);
      expect(() => mlMath.missing_value_imputation(input, { column: 'age', strategy: 'invalid' })).toThrow('Invalid imputation strategy. Must be "mean", "median", or "mode".');
    });

    it('should throw error if no non-missing numerical values for mean/median', () => {
      const data = [{ age: null }, { age: undefined }, { age: 'text' }];
      expect(() => mlMath.missing_value_imputation({ data }, { column: 'age', strategy: 'mean' })).toThrow(AppError);
      expect(() => mlMath.missing_value_imputation({ data }, { column: 'age', strategy: 'median' })).toThrow(AppError);
    });

    it('should handle column with only missing values', () => {
      const data = [{ val: null }, { val: undefined }];
      const params = { column: 'val', strategy: 'mean' };
      expect(() => mlMath.missing_value_imputation({ data }, params)).toThrow(AppError);
      expect(() => mlMath.missing_value_imputation({ data }, params)).toThrow(`No non-missing values found in column 'val' to apply imputation strategy.`);
    });
  });

  // --- Accuracy Score ---
  describe('accuracy_score', () => {
    it('should calculate accuracy score correctly', () => {
      const input = { y_true: [0, 1, 0, 1], y_pred: [0, 1, 1, 1] }; // 3/4 correct
      const result = mlMath.accuracy_score(input);
      expect(result.score).toBe(0.75);
    });

    it('should return 0 for all incorrect predictions', () => {
      const input = { y_true: [0, 1], y_pred: [1, 0] };
      const result = mlMath.accuracy_score(input);
      expect(result.score).toBe(0);
    });

    it('should return 1 for all correct predictions', () => {
      const input = { y_true: [0, 1], y_pred: [0, 1] };
      const result = mlMath.accuracy_score(input);
      expect(result.score).toBe(1);
    });

    it('should throw error for different length arrays', () => {
      const input = { y_true: [0, 1], y_pred: [0] };
      expect(() => mlMath.accuracy_score(input)).toThrow(AppError);
      expect(() => mlMath.accuracy_score(input)).toThrow('y_true and y_pred must have the same length.');
    });
  });

  // --- Precision Score ---
  describe('precision_score', () => {
    it('should calculate precision score correctly for binary classification', () => {
      const input = { y_true: [1, 1, 0, 0], y_pred: [1, 0, 1, 0] }; // TP=1, FP=1, TN=1, FN=1
      const params = { pos_label: 1 }; // Precision for class 1: 1 / (1 + 1) = 0.5
      const result = mlMath.precision_score(input, params);
      expect(result.score).toBe(0.5);
    });

    it('should handle no positive predictions', () => {
      const input = { y_true: [0, 0, 0], y_pred: [0, 0, 0] };
      const params = { pos_label: 1 };
      const result = mlMath.precision_score(input, params);
      expect(result.score).toBe(0);
    });

    it('should throw error if pos_label is missing', () => {
      const input = { y_true: [0, 1], y_pred: [0, 1] };
      expect(() => mlMath.precision_score(input, {})).toThrow(AppError);
      expect(() => mlMath.precision_score(input, {})).toThrow('Parameter "pos_label" is required for precision calculation.');
    });
  });

  // --- Recall Score ---
  describe('recall_score', () => {
    it('should calculate recall score correctly for binary classification', () => {
      const input = { y_true: [1, 1, 0, 0], y_pred: [1, 0, 1, 0] }; // TP=1, FP=1, TN=1, FN=1
      const params = { pos_label: 1 }; // Recall for class 1: 1 / (1 + 1) = 0.5
      const result = mlMath.recall_score(input, params);
      expect(result.score).toBe(0.5);
    });

    it('should handle no actual positive cases', () => {
      const input = { y_true: [0, 0, 0], y_pred: [1, 1, 1] };
      const params = { pos_label: 1 };
      const result = mlMath.recall_score(input, params);
      expect(result.score).toBe(0);
    });

    it('should throw error if pos_label is missing', () => {
      const input = { y_true: [0, 1], y_pred: [0, 1] };
      expect(() => mlMath.recall_score(input, {})).toThrow(AppError);
      expect(() => mlMath.recall_score(input, {})).toThrow('Parameter "pos_label" is required for recall calculation.');
    });
  });

  // --- F1 Score ---
  describe('f1_score', () => {
    it('should calculate f1 score correctly', () => {
      const input = { y_true: [1, 1, 0, 0], y_pred: [1, 0, 1, 0] }; // Precision=0.5, Recall=0.5
      const params = { pos_label: 1 };
      const result = mlMath.f1_score(input, params);
      expect(result.score).toBe(0.5); // 2 * (0.5 * 0.5) / (0.5 + 0.5) = 0.5
    });

    it('should return 0 if precision + recall is 0', () => {
      const input = { y_true: [0, 0], y_pred: [0, 0] };
      const params = { pos_label: 1 };
      const result = mlMath.f1_score(input, params);
      expect(result.score).toBe(0);
    });

    it('should propagate errors from precision/recall if pos_label is missing', () => {
      const input = { y_true: [0, 1], y_pred: [0, 1] };
      expect(() => mlMath.f1_score(input, {})).toThrow(AppError);
    });
  });

  // --- Mean Squared Error (MSE) ---
  describe('mse', () => {
    it('should calculate MSE correctly for numerical values', () => {
      const input = { y_true: [1, 2, 3], y_pred: [1, 2, 4] }; // Errors: 0, 0, -1. Squared: 0, 0, 1. Sum: 1. MSE: 1/3
      const result = mlMath.mse(input);
      expect(result.score).toBeCloseTo(1 / 3);
    });

    it('should return 0 for perfect predictions', () => {
      const input = { y_true: [1, 2, 3], y_pred: [1, 2, 3] };
      const result = mlMath.mse(input);
      expect(result.score).toBe(0);
    });

    it('should throw error for non-numerical values', () => {
      const input = { y_true: [1, 'a'], y_pred: [1, 2] };
      expect(() => mlMath.mse(input)).toThrow(AppError);
      expect(() => mlMath.mse(input)).toThrow('y_true and y_pred must contain only numerical values for MSE.');
    });
  });

  // --- Root Mean Squared Error (RMSE) ---
  describe('rmse', () => {
    it('should calculate RMSE correctly', () => {
      const input = { y_true: [1, 2, 3], y_pred: [1, 2, 4] }; // MSE: 1/3
      const result = mlMath.rmse(input);
      expect(result.score).toBeCloseTo(Math.sqrt(1 / 3));
    });

    it('should return 0 for perfect predictions', () => {
      const input = { y_true: [1, 2, 3], y_pred: [1, 2, 3] };
      const result = mlMath.rmse(input);
      expect(result.score).toBe(0);
    });
  });

  // --- Mean Absolute Error (MAE) ---
  describe('mae', () => {
    it('should calculate MAE correctly for numerical values', () => {
      const input = { y_true: [1, 2, 3], y_pred: [1, 2, 4] }; // Absolute errors: 0, 0, 1. Sum: 1. MAE: 1/3
      const result = mlMath.mae(input);
      expect(result.score).toBeCloseTo(1 / 3);
    });

    it('should return 0 for perfect predictions', () => {
      const input = { y_true: [1, 2, 3], y_pred: [1, 2, 3] };
      const result = mlMath.mae(input);
      expect(result.score).toBe(0);
    });

    it('should throw error for non-numerical values', () => {
      const input = { y_true: [1, 'a'], y_pred: [1, 2] };
      expect(() => mlMath.mae(input)).toThrow(AppError);
      expect(() => mlMath.mae(input)).toThrow('y_true and y_pred must contain only numerical values for MAE.');
    });
  });
});