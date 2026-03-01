```javascript
// migrations/00000000000006-create-idempotency-keys-table.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('idempotency_keys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING,
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
      requestHash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      requestMethod: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      requestPath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      requestBody: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      responseStatusCode: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      responseBody: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
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
    // Composite unique index for idempotency key per merchant
    await queryInterface.addIndex('idempotency_keys', ['key', 'merchantId'], { unique: true });
    await queryInterface.addIndex('idempotency_keys', ['expiresAt']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('idempotency_keys');
  }
};
```