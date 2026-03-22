```javascript
'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Products', [
      {
        id: uuidv4(),
        name: 'Laptop Pro 16',
        description: 'High-performance laptop for professionals, with 16GB RAM and 512GB SSD.',
        price: 1899.99,
        quantity: 50,
        category: 'Electronics',
        imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6205193?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Wireless Ergonomic Mouse',
        description: 'Comfortable and precise wireless mouse, ideal for long working hours.',
        price: 49.99,
        quantity: 200,
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1628102491629-da4c414603ee?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: '4K Ultra HD Monitor',
        description: 'Stunning 32-inch 4K monitor with vibrant colors and crisp details.',
        price: 499.00,
        quantity: 75,
        category: 'Electronics',
        imageUrl: 'https://images.unsplash.com/photo-1542393529-577747e937d2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Mechanical Keyboard RGB',
        description: 'Gaming mechanical keyboard with customizable RGB lighting and tactile switches.',
        price: 129.50,
        quantity: 120,
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1616763355548-a006c09b1a62?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Noise-Cancelling Headphones',
        description: 'Premium headphones with active noise cancellation for immersive audio experience.',
        price: 249.00,
        quantity: 90,
        category: 'Audio',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06f2e0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Products', null, {});
  }
};
```