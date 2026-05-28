```javascript
'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    // Seed Users
    const users = await queryInterface.bulkInsert('users', [{
      id: uuidv4(),
      username: 'adminuser',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
      id: uuidv4(),
      username: 'regularuser',
      email: 'user@example.com',
      password: userPassword,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    }], { returning: true });

    const adminUserId = users.find(u => u.username === 'adminuser').id;
    const regularUserId = users.find(u => u.username === 'regularuser').id;

    // Seed Categories
    const categories = await queryInterface.bulkInsert('categories', [{
      id: uuidv4(),
      name: 'Electronics',
      description: 'Gadgets and electronic devices.',
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
      id: uuidv4(),
      name: 'Books',
      description: 'A wide range of books.',
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
        id: uuidv4(),
        name: 'Clothing',
        description: 'Apparel for all ages.',
        createdAt: new Date(),
        updatedAt: new Date()
    }], { returning: true });

    const electronicsId = categories.find(c => c.name === 'Electronics').id;
    const booksId = categories.find(c => c.name === 'Books').id;
    const clothingId = categories.find(c => c.name === 'Clothing').id;


    // Seed Products
    const products = await queryInterface.bulkInsert('products', [{
      id: uuidv4(),
      name: 'Smartphone X',
      description: 'A powerful smartphone with advanced features.',
      price: 699.99,
      imageUrl: 'https://example.com/smartphone_x.jpg',
      stock: 50,
      categoryId: electronicsId,
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
      id: uuidv4(),
      name: 'Laptop Pro',
      description: 'High-performance laptop for professionals.',
      price: 1299.99,
      imageUrl: 'https://example.com/laptop_pro.jpg',
      stock: 30,
      categoryId: electronicsId,
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
      id: uuidv4(),
      name: 'The Great Novel',
      description: 'An epic story of adventure and discovery.',
      price: 25.00,
      imageUrl: 'https://example.com/novel.jpg',
      stock: 100,
      categoryId: booksId,
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
        id: uuidv4(),
        name: 'T-Shirt Classic',
        description: 'Comfortable cotton t-shirt.',
        price: 19.99,
        imageUrl: 'https://example.com/tshirt.jpg',
        stock: 200,
        categoryId: clothingId,
        createdAt: new Date(),
        updatedAt: new Date()
    }], { returning: true });

    const smartphoneXId = products.find(p => p.name === 'Smartphone X').id;
    const laptopProId = products.find(p => p.name === 'Laptop Pro').id;
    const greatNovelId = products.find(p => p.name === 'The Great Novel').id;
    const tShirtClassicId = products.find(p => p.name === 'T-Shirt Classic').id;


    // Seed Carts
    const carts = await queryInterface.bulkInsert('carts', [{
        id: uuidv4(),
        userId: regularUserId,
        createdAt: new Date(),
        updatedAt: new Date()
    }], { returning: true });

    const regularUserCartId = carts.find(c => c.userId === regularUserId).id;

    // Seed CartItems for the regular user
    await queryInterface.bulkInsert('cart_items', [{
        id: uuidv4(),
        cartId: regularUserCartId,
        productId: smartphoneXId,
        quantity: 1,
        priceAtAddition: 699.99, // Should match product price
        createdAt: new Date(),
        updatedAt: new Date()
    }, {
        id: uuidv4(),
        cartId: regularUserCartId,
        productId: greatNovelId,
        quantity: 2,
        priceAtAddition: 25.00,
        createdAt: new Date(),
        updatedAt: new Date()
    }]);

    // Seed Reviews
    await queryInterface.bulkInsert('reviews', [{
      id: uuidv4(),
      userId: regularUserId,
      productId: smartphoneXId,
      rating: 5,
      comment: 'Absolutely love this phone!',
      createdAt: new Date(),
      updatedAt: new Date()
    }, {
        id: uuidv4(),
        userId: regularUserId,
        productId: tShirtClassicId,
        rating: 4,
        comment: 'Comfortable and fits well.',
        createdAt: new Date(),
        updatedAt: new Date()
    }]);


  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('payments', null, {});
    await queryInterface.bulkDelete('reviews', null, {});
    await queryInterface.bulkDelete('order_items', null, {});
    await queryInterface.bulkDelete('orders', null, {});
    await queryInterface.bulkDelete('cart_items', null, {});
    await queryInterface.bulkDelete('carts', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
```