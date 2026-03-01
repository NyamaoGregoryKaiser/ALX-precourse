```javascript
// seeders/00000000000000-seed-admin-user.js
// ALX Principle: Seed Data
// Populate the database with initial, necessary data (e.g., admin user).
'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('Password123!', 10); // ALX: Strong password
    const adminUserId = uuidv4();

    await queryInterface.bulkInsert('users', [{
      id: adminUserId,
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});

    // You can also seed a dummy merchant if needed for initial testing
    const dummyMerchantId = uuidv4();
    await queryInterface.bulkInsert('merchants', [{
      id: dummyMerchantId,
      name: 'Test Merchant Inc.',
      email: 'test@merchant.com',
      businessCategory: 'E-commerce',
      apiKey: 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz', // DANGER: Never hardcode real API keys
      isActive: true,
      lastApiKeyRotation: new Date(),
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});

    // Save for potential future seeds if we need to reference them
    // For now, we'll just log
    console.log(`Seeded admin user: admin@example.com with ID: ${adminUserId}`);
    console.log(`Seeded dummy merchant with ID: ${dummyMerchantId}`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
    await queryInterface.bulkDelete('merchants', { email: 'test@merchant.com' }, {});
  }
};
```