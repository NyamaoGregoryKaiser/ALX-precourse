```javascript
// migrations/00000000000004-create-webhook-configs-table.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('webhook_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      merchantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'merchants',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      secret: {
        type: Sequelize.STRING, // Secret for signing/verifying webhooks
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      events: {
        type: Sequelize.ARRAY(Sequelize.STRING), // e.g., ['transaction.created', 'transaction.captured']
        defaultValue: [],
        allowNull: false,
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
    await queryInterface.addIndex('webhook_configs', ['merchantId']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('webhook_configs');
  }
};
```