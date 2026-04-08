'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Find the user IDs from the 'demo-users' seeder
    const users = await queryInterface.sequelize.query(
      'SELECT id, email from users;',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const adminUser = users.find(u => u.email === 'admin@example.com');
    const regularUser = users.find(u => u.email === 'user@example.com');

    await queryInterface.bulkInsert('products', [
      {
        name: 'Laptop Pro X',
        description: 'High-performance laptop for professionals, with 16GB RAM and 512GB SSD.',
        price: 1200.00,
        stock: 50,
        userId: adminUser ? adminUser.id : 1, // Fallback to 1 if user not found (less robust)
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Wireless Ergonomic Mouse',
        description: 'Comfortable wireless mouse with programmable buttons, ideal for long working hours.',
        price: 45.99,
        stock: 200,
        userId: regularUser ? regularUser.id : 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: '4K Ultra HD Monitor',
        description: '27-inch monitor with stunning 4K resolution, perfect for design and gaming.',
        price: 399.99,
        stock: 75,
        userId: adminUser ? adminUser.id : 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'USB-C Hub Multiport Adapter',
        description: '7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader, and power delivery.',
        price: 29.99,
        stock: 150,
        userId: regularUser ? regularUser.id : 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Mechanical Keyboard RGB',
        description: 'Gaming mechanical keyboard with customizable RGB backlighting and tactile switches.',
        price: 89.99,
        stock: 100,
        userId: adminUser ? adminUser.id : 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('products', null, {});
  },
};
```