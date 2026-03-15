'use strict';
const bcrypt = require('bcryptjs');
const { generateUniqueId } = require('../../utils/helpers'); // Assuming you have a helper

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('adminpassword123', 12); // Use a strong password in production

    await queryInterface.bulkInsert('customers', [
      {
        id: generateUniqueId('cust'), // Helper to generate unique ID like 'cust_abcdef123'
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: generateUniqueId('cust'),
        name: 'Test Customer',
        email: 'customer@example.com',
        password: await bcrypt.hash('customerpassword123', 12),
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('customers', { email: 'admin@example.com' }, {});
    await queryInterface.bulkDelete('customers', { email: 'customer@example.com' }, {});
  }
};