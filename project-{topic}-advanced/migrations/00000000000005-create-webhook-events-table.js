```javascript
// migrations/00000000000005-create-webhook-events-table.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('webhook_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      webhookConfigId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'webhook_configs',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      eventType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      responseStatusCode: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      responseBody: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      success: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      attemptCount: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },
      lastAttemptedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      nextAttemptAt: {
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
    await queryInterface.addIndex('webhook_events', ['webhookConfigId']);
    await queryInterface.addIndex('webhook_events', ['eventType']);
    await queryInterface.addIndex('webhook_events', ['success']);
    await queryInterface.addIndex('webhook_events', ['nextAttemptAt']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('webhook_events');
  }
};
```