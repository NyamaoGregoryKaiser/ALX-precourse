const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');

describe('Utility Function Tests', () => {
  describe('pick', () => {
    it('should pick specified keys from an object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = ['a', 'c'];
      const result = pick(obj, keys);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should ignore keys not present in the object', () => {
      const obj = { a: 1, b: 2 };
      const keys = ['a', 'c'];
      const result = pick(obj, keys);
      expect(result).toEqual({ a: 1 });
    });

    it('should return an empty object if no keys are provided', () => {
      const obj = { a: 1, b: 2 };
      const keys = [];
      const result = pick(obj, keys);
      expect(result).toEqual({});
    });

    it('should return an empty object if the input object is null or undefined', () => {
      const keys = ['a'];
      expect(pick(null, keys)).toEqual({});
      expect(pick(undefined, keys)).toEqual({});
    });
  });

  describe('ApiError', () => {
    it('should create an instance of ApiError with correct properties', () => {
      const error = new ApiError(httpStatus.BAD_REQUEST, 'Test error message');
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(httpStatus.BAD_REQUEST);
      expect(error.message).toBe('Test error message');
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should set isOperational to false if specified', () => {
      const error = new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal error', false);
      expect(error.isOperational).toBe(false);
    });

    it('should use provided stack trace', () => {
      const customStack = 'Custom stack trace\n  at func (file.js:1:1)';
      const error = new ApiError(httpStatus.NOT_FOUND, 'Not found', true, customStack);
      expect(error.stack).toBe(customStack);
    });
  });
});