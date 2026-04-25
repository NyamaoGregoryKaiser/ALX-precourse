```javascript
'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hash passwords before seeding
    const hashedPasswordAdmin = await bcrypt.hash('admin1234', 10);
    const hashedPasswordUser = await bcrypt.hash('user1234', 10);

    const adminId = uuidv4();
    const userId = uuidv4();

    // Seed Users
    await queryInterface.bulkInsert('users', [
      {
        id: adminId,
        username: 'adminuser',
        email: 'admin@example.com',
        password: hashedPasswordAdmin,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: userId,
        username: 'testuser',
        email: 'user@example.com',
        password: hashedPasswordUser,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});

    // Seed Products
    await queryInterface.bulkInsert('products', [
      {
        id: uuidv4(),
        name: 'Enterprise Widget',
        description: 'A robust and scalable widget for all your enterprise needs.',
        price: 99.99,
        stock: 150,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Secure Firewall Pro',
        description: 'Next-gen firewall with advanced threat protection.',
        price: 1299.00,
        stock: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Cloud Storage Solution',
        description: 'Scalable and secure cloud storage for businesses.',
        price: 24.50,
        stock: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    // Delete all data in reverse order of insertion
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
```