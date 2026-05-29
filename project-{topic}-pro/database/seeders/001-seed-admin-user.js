```javascript
'use strict';
const { hashPassword } = require('../../api/src/utils/password');
const { ROLES } = require('../../api/src/config/constants');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await hashPassword('Admin@123'); // Strong password for admin
    const adminUserId = uuidv4();

    await queryInterface.bulkInsert('users', [
      {
        id: adminUserId,
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: ROLES.ADMIN,
        is_email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        first_name: 'Test',
        last_name: 'User',
        email: 'user@example.com',
        password: await hashPassword('User@123'), // Strong password for user
        role: ROLES.USER,
        is_email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ], {});

    console.log('Admin user seeded successfully with email: admin@example.com and password: Admin@123');
    console.log('Test user seeded successfully with email: user@example.com and password: User@123');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
    await queryInterface.bulkDelete('users', { email: 'user@example.com' }, {});
  }
};
```