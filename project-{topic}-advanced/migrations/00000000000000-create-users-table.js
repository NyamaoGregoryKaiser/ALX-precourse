```javascript
// migrations/00000000000000-create-users-table.js
// ALX Principle: Database Migrations
// Use migrations for controlled schema evolution, ensuring repeatable deployments.
'use strict';
const { v4: uuidv4 } = require('uuid'); // Import UUID generator

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4, // Use Sequelize's UUIDV4 for UUID generation
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('user', 'admin'),
        defaultValue: 'user',
      },
      isEmailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    // Add index for email for faster lookups
    await queryInterface.addIndex('users', ['email']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};
```