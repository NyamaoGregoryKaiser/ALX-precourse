```javascript
'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('AdminPassword1', 10);
    const userPassword = await bcrypt.hash('UserPassword1', 10);

    await queryInterface.bulkInsert('Users', [{
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Regular User',
      email: 'user@example.com',
      password: userPassword,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});

    await queryInterface.bulkInsert('Products', [{
      name: 'Laptop X1',
      description: 'High performance laptop for gaming and work.',
      price: 1500.00,
      stock: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Smartphone Pro',
      description: 'Latest smartphone with advanced camera.',
      price: 800.00,
      stock: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Wireless Earbuds',
      description: 'Noise-cancelling wireless earbuds.',
      price: 150.00,
      stock: 300,
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});

    // You can add orders here as well, but it might be easier to create them via API after initial setup.
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {});
    await queryInterface.bulkDelete('Products', null, {});
    await queryInterface.bulkDelete('Orders', null, {});
  }
};
```