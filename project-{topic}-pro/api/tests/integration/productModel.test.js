```javascript
const { sequelize } = require('../../src/config/db');
const { Product, Category } = require('../../src/models');
const { v4: uuidv4 } = require('uuid');
const { PRODUCT_AVAILABILITY } = require('../../src/config/constants');

describe('Product Model Integration', () => {
  let testCategory;
  let testProduct;

  beforeAll(async () => {
    // Connect to test database, run migrations, and clear tables
    // In a real CI/CD, this would be a fresh test database for each run.
    // For local integration tests, we just connect and sync/clean.
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // DANGER: This drops tables! Use for testing only.

    testCategory = await Category.create({
      id: uuidv4(),
      name: 'Test Category',
      description: 'A category for testing products.',
      imageUrl: 'http://test.com/category.jpg',
    });

    testProduct = await Product.create({
      id: uuidv4(),
      name: 'Test Product 1',
      description: 'A description for test product 1.',
      price: 19.99,
      stockQuantity: 10,
      imageUrl: 'http://test.com/product1.jpg',
      categoryId: testCategory.id,
      availability: PRODUCT_AVAILABILITY.IN_STOCK,
    });
  });

  afterAll(async () => {
    // Clean up and close connection
    await sequelize.close();
  });

  describe('Product Creation', () => {
    test('should create a new product successfully', async () => {
      const newProduct = {
        id: uuidv4(),
        name: 'New Test Product',
        description: 'This is a new product for integration testing.',
        price: 29.99,
        stockQuantity: 5,
        imageUrl: 'http://test.com/new_product.jpg',
        categoryId: testCategory.id,
      };

      const createdProduct = await Product.create(newProduct);

      expect(createdProduct).toBeDefined();
      expect(createdProduct.name).toBe(newProduct.name);
      expect(parseFloat(createdProduct.price)).toBe(newProduct.price);
      expect(createdProduct.stockQuantity).toBe(newProduct.stockQuantity);
      expect(createdProduct.categoryId).toBe(newProduct.categoryId);
      expect(createdProduct.availability).toBe(PRODUCT_AVAILABILITY.IN_STOCK); // Default value check

      const foundProduct = await Product.findByPk(newProduct.id);
      expect(foundProduct).toBeDefined();
      expect(foundProduct.name).toBe(newProduct.name);
    });

    test('should automatically set availability to OUT_OF_STOCK if stockQuantity is 0 during creation', async () => {
      const productWithZeroStock = {
        id: uuidv4(),
        name: 'Zero Stock Product',
        price: 5.00,
        stockQuantity: 0,
        categoryId: testCategory.id,
      };

      const createdProduct = await Product.create(productWithZeroStock);

      expect(createdProduct).toBeDefined();
      expect(createdProduct.stockQuantity).toBe(0);
      expect(createdProduct.availability).toBe(PRODUCT_AVAILABILITY.OUT_OF_STOCK);
    });

    test('should fail to create product with invalid price (negative)', async () => {
      const invalidProduct = {
        id: uuidv4(),
        name: 'Invalid Price Product',
        price: -5.00,
        stockQuantity: 10,
        categoryId: testCategory.id,
      };

      await expect(Product.create(invalidProduct)).rejects.toThrow(
        Sequelize.ValidationError // Sequelize validation error
      );
    });
  });

  describe('Product Updates', () => {
    test('should update product details successfully', async () => {
      const updatedName = 'Updated Test Product Name';
      const updatedPrice = 25.50;

      testProduct.name = updatedName;
      testProduct.price = updatedPrice;
      await testProduct.save();

      const foundProduct = await Product.findByPk(testProduct.id);
      expect(foundProduct.name).toBe(updatedName);
      expect(parseFloat(foundProduct.price)).toBe(updatedPrice);
    });

    test('should update availability when stockQuantity changes', async () => {
      // Set to 0, should become OUT_OF_STOCK
      testProduct.stockQuantity = 0;
      await testProduct.save();
      expect(testProduct.availability).toBe(PRODUCT_AVAILABILITY.OUT_OF_STOCK);

      // Set to > 0, should become IN_STOCK
      testProduct.stockQuantity = 5;
      await testProduct.save();
      expect(testProduct.availability).toBe(PRODUCT_AVAILABILITY.IN_STOCK);
    });
  });

  describe('Product Deletion', () => {
    test('should delete a product successfully', async () => {
      const productToDelete = await Product.create({
        id: uuidv4(),
        name: 'Temporary Product',
        price: 10.00,
        stockQuantity: 1,
        categoryId: testCategory.id,
      });

      await productToDelete.destroy();

      const foundProduct = await Product.findByPk(productToDelete.id);
      expect(foundProduct).toBeNull();
    });
  });

  describe('Product Associations', () => {
    test('should retrieve product with its category', async () => {
      const productWithCategory = await Product.findByPk(testProduct.id, {
        include: [{ model: Category, as: 'category' }],
      });

      expect(productWithCategory).toBeDefined();
      expect(productWithCategory.category).toBeDefined();
      expect(productWithCategory.category.id).toBe(testCategory.id);
      expect(productWithCategory.category.name).toBe(testCategory.name);
    });

    test('should handle category deletion by setting category_id to NULL', async () => {
      const productInTest = await Product.create({
        id: uuidv4(),
        name: 'Product for Category Delete Test',
        price: 50.00,
        stockQuantity: 20,
        categoryId: testCategory.id,
      });

      await testCategory.destroy(); // This should trigger SET NULL on products

      const foundProduct = await Product.findByPk(productInTest.id);
      expect(foundProduct).toBeDefined();
      expect(foundProduct.categoryId).toBeNull(); // Category ID should be nullified
      const foundCategory = await Category.findByPk(testCategory.id);
      expect(foundCategory).toBeNull(); // Category itself should be deleted
    });
  });
});
```