```javascript
'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'adminpassword', 12);
    await queryInterface.bulkInsert('Users', [{
      id: uuidv4(),
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', {
      email: process.env.ADMIN_EMAIL || 'admin@example.com'
    }, {});
  }
};
```