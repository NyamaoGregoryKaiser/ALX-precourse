const productService = require('../../src/services/productService');
const sequelize = require('../../src/config/database');
const Product = require('../../src/models/Product')(sequelize, require('sequelize'));
const User = require('../../src/models/User')(sequelize, require('sequelize'));
const { NotFoundError, APIError } = require('../../src/utils/errors');

// Mock Product and User models
jest.mock('../../src/models/Product', () => {
  const SequelizeMock = require('sequelize-mock');
  const DB = new SequelizeMock();
  const ProductMock = DB.define('Product', {
    id: 1,
    name: 'Test Product',
    description: 'A description',
    price: 10.00,
    stock: 5,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  ProductMock.findByPk = jest.fn();
  ProductMock.create = jest.fn();
  ProductMock.findAndCountAll = jest.fn();
  ProductMock.destroy = jest.fn();
  ProductMock.prototype.update = jest.fn();
  return jest.fn(() => ProductMock);
});

jest.mock('../../src/models/User', () => {
  const SequelizeMock = require('sequelize-mock');
  const DB = new SequelizeMock();
  const UserMock = DB.define('User', {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
  });
  return jest.fn(() => UserMock);
});

describe('ProductService Unit Tests', () => {
  let ProductMock;
  let UserMock;

  beforeAll(() => {
    ProductMock = Product(); // Get the mocked Product model instance
    UserMock = User(); // Get the mocked User model instance
  });

  beforeEach(() => {
    // Reset mocks before each test
    ProductMock.findByPk.mockReset();
    ProductMock.create.mockReset();
    ProductMock.findAndCountAll.mockReset();
    ProductMock.destroy.mockReset();
    ProductMock.prototype.update.mockReset();
  });

  describe('createProduct', () => {
    it('should successfully create a new product', async () => {
      const productData = {
        name: 'New Product',
        description: 'New Description',
        price: 25.00,
        stock: 10,
        userId: 1,
      };
      const mockCreatedProduct = { id: 2, ...productData };
      const mockProductWithUser = { ...mockCreatedProduct, User: { id: 1, username: 'testuser' } };

      ProductMock.create.mockResolvedValueOnce(mockCreatedProduct);
      ProductMock.findByPk.mockResolvedValueOnce(mockProductWithUser); // Mock fetching with association

      const product = await productService.createProduct(productData);

      expect(ProductMock.create).toHaveBeenCalledWith(productData);
      expect(ProductMock.findByPk).toHaveBeenCalledWith(mockCreatedProduct.id, expect.any(Object));
      expect(product).toEqual(mockProductWithUser);
    });

    it('should throw APIError if product creation fails', async () => {
      ProductMock.create.mockRejectedValueOnce(new Error('DB error'));

      await expect(productService.createProduct({})).rejects.toThrow(APIError);
    });
  });

  describe('getAllProducts', () => {
    it('should return a list of products with pagination', async () => {
      const mockProducts = [{ id: 1, name: 'Product 1' }];
      ProductMock.findAndCountAll.mockResolvedValueOnce({
        count: 1,
        rows: mockProducts,
      });

      const { products, total } = await productService.getAllProducts(1, 10);

      expect(ProductMock.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      }));
      expect(products).toEqual(mockProducts);
      expect(total).toBe(1);
    });

    it('should apply search filter if provided', async () => {
      const mockProducts = [{ id: 1, name: 'Searched Product' }];
      ProductMock.findAndCountAll.mockResolvedValueOnce({
        count: 1,
        rows: mockProducts,
      });

      await productService.getAllProducts(1, 10, 'search_term');

      expect(ProductMock.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { name: { [require('sequelize').Op.iLike]: '%search_term%' } },
      }));
    });

    it('should throw APIError if fetching products fails', async () => {
      ProductMock.findAndCountAll.mockRejectedValueOnce(new Error('DB error'));

      await expect(productService.getAllProducts(1, 10)).rejects.toThrow(APIError);
    });
  });

  describe('getProductById', () => {
    it('should return a product if found', async () => {
      const mockProduct = { id: 1, name: 'Product', User: { id: 1 } };
      ProductMock.findByPk.mockResolvedValueOnce(mockProduct);

      const product = await productService.getProductById(1);

      expect(ProductMock.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(product).toEqual(mockProduct);
    });

    it('should return null if product not found', async () => {
      ProductMock.findByPk.mockResolvedValueOnce(null);

      const product = await productService.getProductById(99);

      expect(product).toBeNull();
    });

    it('should throw APIError if fetching product fails', async () => {
      ProductMock.findByPk.mockRejectedValueOnce(new Error('DB error'));

      await expect(productService.getProductById(1)).rejects.toThrow(APIError);
    });
  });

  describe('updateProduct', () => {
    it('should successfully update an existing product', async () => {
      const mockProductInstance = {
        id: 1,
        name: 'Old Name',
        description: 'Old Desc',
        price: 10,
        stock: 5,
        userId: 1,
        update: ProductMock.prototype.update,
      };
      const updatedData = { name: 'Updated Name', price: 15.00 };
      const mockUpdatedProduct = { ...mockProductInstance, ...updatedData, User: { id: 1 } };

      ProductMock.findByPk.mockResolvedValueOnce(mockProductInstance); // For finding
      ProductMock.prototype.update.mockResolvedValueOnce(mockUpdatedProduct); // For update method
      ProductMock.findByPk.mockResolvedValueOnce(mockUpdatedProduct); // For fetching updated

      const product = await productService.updateProduct(1, updatedData);

      expect(ProductMock.findByPk).toHaveBeenCalledWith(1);
      expect(mockProductInstance.update).toHaveBeenCalledWith(updatedData);
      expect(product).toEqual(mockUpdatedProduct);
    });

    it('should throw NotFoundError if product to update is not found', async () => {
      ProductMock.findByPk.mockResolvedValueOnce(null);

      await expect(productService.updateProduct(99, { name: 'New Name' })).rejects.toThrow(NotFoundError);
    });

    it('should throw APIError if update operation fails', async () => {
      const mockProductInstance = { id: 1, update: ProductMock.prototype.update };
      ProductMock.findByPk.mockResolvedValueOnce(mockProductInstance);
      ProductMock.prototype.update.mockRejectedValueOnce(new Error('DB error'));

      await expect(productService.updateProduct(1, { name: 'Updated Name' })).rejects.toThrow(APIError);
    });
  });

  describe('deleteProduct', () => {
    it('should successfully delete a product', async () => {
      const mockProductInstance = { id: 1, destroy: jest.fn().mockResolvedValue(true) };
      ProductMock.findByPk.mockResolvedValueOnce(mockProductInstance);

      const result = await productService.deleteProduct(1);

      expect(ProductMock.findByPk).toHaveBeenCalledWith(1);
      expect(mockProductInstance.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if product to delete is not found', async () => {
      ProductMock.findByPk.mockResolvedValueOnce(null);

      const result = await productService.deleteProduct(99);

      expect(result).toBe(false);
    });

    it('should throw APIError if deletion fails', async () => {
      const mockProductInstance = { id: 1, destroy: jest.fn().mockRejectedValue(new Error('DB error')) };
      ProductMock.findByPk.mockResolvedValueOnce(mockProductInstance);

      await expect(productService.deleteProduct(1)).rejects.toThrow(APIError);
    });
  });
});
```