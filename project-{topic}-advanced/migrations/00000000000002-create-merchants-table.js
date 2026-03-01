```javascript
// migrations/00000000000002-create-merchants-table.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('merchants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
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
      businessCategory: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      apiKey: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true, // API key should be unique
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      lastApiKeyRotation: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true,
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
    await queryInterface.addIndex('merchants', ['email']);
    await queryInterface.addIndex('merchants', ['apiKey']); // Index for API key lookups
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('merchants');
  }
};
```