```javascript
const productService = require('../../src/services/productService');
const db = require('../../src/database');
const { AppError } = require('../../src/utils/appError');

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('ProductService Unit Tests', () => {
  let adminUser, testProduct, anotherUser;

  beforeEach(async () => {
    await db.sequelize.sync({ force: true });
    const { up: seedUp } = require('../../src/database/seeders/YYYYMMDDHHMMSS-initial-data');
    await seedUp(db.sequelize.queryInterface, db.sequelize.Sequelize);

    adminUser = await db.User.findOne({ where: { username: 'admin' } });
    anotherUser = await db.User.findOne({ where: { username: 'testuser' } });
    testProduct = await db.Product.findOne({ where: { name: 'Laptop Pro X' } });
  });

  describe('getAllProducts', () => {
    it('should return all products with pagination and owner info', async () => {
      const result = await productService.getAllProducts({});
      expect(result).toHaveProperty('products');
      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products[0]).toHaveProperty('owner');
      expect(result.products[0].owner).toHaveProperty('username');
      expect(result.totalItems).toBe(4); // Based on seed data
    });

    it('should filter products by search query', async () => {
      const result = await productService.getAllProducts({ search: 'laptop' });
      expect(result.products.length).toBe(1);
      expect(result.products[0].name).toBe('Laptop Pro X');
    });

    it('should filter products by category', async () => {
      const result = await productService.getAllProducts({ category: 'Accessories' });
      expect(result.products.length).toBe(2);
      expect(result.products.some(p => p.name === 'Mechanical Keyboard RGB')).toBe(true);
      expect(result.products.some(p => p.name === 'Wireless Mouse Ergonomic')).toBe(true);
    });

    it('should filter products by price range', async () => {
      const result = await productService.getAllProducts({ minPrice: 100, maxPrice: 700 });
      expect(result.products.length).toBe(1);
      expect(result.products[0].name).toBe('Monitor UltraWide 4K');
    });

    it('should paginate results', async () => {
      const result = await productService.getAllProducts({ page: 1, limit: 2 });
      expect(result.products.length).toBe(2);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(2); // 4 items, limit 2 = 2 pages
    });

    it('should sort products by name ASC', async () => {
      const result = await productService.getAllProducts({ sortBy: 'name', order: 'ASC' });
      expect(result.products[0].name).toBe('Laptop Pro X'); // Alphabetically sorted from seed data
    });
  });

  describe('getProductById', () => {
    it('should return a product by its ID', async () => {
      const product = await productService.getProductById(testProduct.id);
      expect(product.name).toBe(testProduct.name);
      expect(product).toHaveProperty('owner');
      expect(product.owner.username).toBe(adminUser.username);
    });

    it('should throw AppError if product not found', async () => {
      await expect(productService.getProductById('some-non-existent-id')).rejects.toThrow(
        new AppError('Product with ID some-non-existent-id not found.', 404)
      );
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const newProductData = {
        name: 'New Gadget',
        description: 'A fantastic new gadget.',
        price: 49.99,
        stock: 100,
        category: 'Electronics',
      };
      const newProduct = await productService.createProduct(newProductData, adminUser.id);

      expect(newProduct).toHaveProperty('id');
      expect(newProduct.name).toBe(newProductData.name);
      expect(newProduct.userId).toBe(adminUser.id);

      const foundProduct = await db.Product.findByPk(newProduct.id);
      expect(foundProduct).not.toBeNull();
    });

    it('should throw AppError if product with same name already exists', async () => {
      const newProductData = {
        name: 'Laptop Pro X', // Existing name
        description: 'Another laptop.',
        price: 1000.00,
        stock: 10,
      };
      await expect(productService.createProduct(newProductData, adminUser.id)).rejects.toThrow(
        new AppError("Product with name 'Laptop Pro X' already exists.", 409)
      );
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', async () => {
      const updateData = {
        name: 'Updated Laptop Pro X',
        price: 1250.00,
      };
      const updatedProduct = await productService.updateProduct(testProduct.id, updateData);

      expect(updatedProduct.name).toBe(updateData.name);
      expect(parseFloat(updatedProduct.price)).toBe(updateData.price);

      const foundProduct = await db.Product.findByPk(testProduct.id);
      expect(foundProduct.name).toBe(updateData.name);
    });

    it('should throw AppError if product not found', async () => {
      await expect(productService.updateProduct('some-non-existent-id', { name: 'Non Existent' })).rejects.toThrow(
        new AppError('Product with ID some-non-existent-id not found.', 404)
      );
    });

    it('should throw AppError if updating name to an existing product name', async () => {
      const productToUpdate = await db.Product.create({
        name: 'Unique Test Product',
        price: 10, stock: 10, userId: adminUser.id
      });
      const anotherProduct = await db.Product.create({
        name: 'Another Unique Product',
        price: 20, stock: 20, userId: adminUser.id
      });

      await expect(productService.updateProduct(productToUpdate.id, { name: anotherProduct.name })).rejects.toThrow(
        new AppError(`Product with name '${anotherProduct.name}' already exists.`, 409)
      );
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete a product', async () => {
      const result = await productService.deleteProduct(testProduct.id);
      expect(result).toBe(true);

      const foundProduct = await db.Product.findByPk(testProduct.id);
      expect(foundProduct).toBeNull(); // Should not be found by default scope (paranoid: true)

      const deletedProduct = await db.Product.findByPk(testProduct.id, { paranoid: false });
      expect(deletedProduct).not.toBeNull();
      expect(deletedProduct.deletedAt).not.toBeNull();
    });

    it('should throw AppError if product not found for deletion', async () => {
      await expect(productService.deleteProduct('some-non-existent-id')).rejects.toThrow(
        new AppError('Product with ID some-non-existent-id not found.', 404)
      );
    });
  });

  describe('restoreProduct', () => {
    let deletedProduct;
    beforeEach(async () => {
      await productService.deleteProduct(testProduct.id);
      deletedProduct = await db.Product.findByPk(testProduct.id, { paranoid: false });
    });

    it('should restore a soft-deleted product', async () => {
      const result = await productService.restoreProduct(deletedProduct.id);
      expect(result).toHaveProperty('id', deletedProduct.id);
      expect(result.deletedAt).toBeNull();

      const foundProduct = await db.Product.findByPk(deletedProduct.id);
      expect(foundProduct).not.toBeNull(); // Should be found now
    });

    it('should throw AppError if product not found for restoration', async () => {
      await expect(productService.restoreProduct('some-non-existent-id')).rejects.toThrow(
        new AppError('Product with ID some-non-existent-id not found.', 404)
      );
    });

    it('should throw AppError if product is not soft-deleted', async () => {
      const activeProduct = await db.Product.findOne();
      await expect(productService.restoreProduct(activeProduct.id)).rejects.toThrow(
        new AppError(`Product with ID ${activeProduct.id} is not soft-deleted.`, 400)
      );
    });
  });
});
```