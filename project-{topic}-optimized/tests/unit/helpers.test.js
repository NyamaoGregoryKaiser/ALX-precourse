const { generateUniqueId } = require('../../src/utils/helpers');

describe('Helper Functions', () => {
  describe('generateUniqueId', () => {
    it('should generate a unique ID with the given prefix', () => {
      const id1 = generateUniqueId('test');
      const id2 = generateUniqueId('test');
      expect(id1).toMatch(/^test_[a-z0-9]{12,}$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate a unique ID with default prefix if none provided', () => {
      const id = generateUniqueId();
      expect(id).toMatch(/^id_[a-z0-9]{12,}$/);
    });
  });

  // More unit tests for other utilities, services, etc.
});