```javascript
// migrations/00000000000003-create-transactions-table.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('transactions', {
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
        onDelete: 'SET NULL',
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'authorized',
          'captured',
          'partially_captured',
          'refunded',
          'partially_refunded',
          'failed',
          'voided',
          'disputed'
        ),
        defaultValue: 'pending',
        allowNull: false,
      },
      paymentMethodType: {
        type: Sequelize.ENUM('card', 'bank_transfer', 'mobile_money', 'wallet'),
        allowNull: false,
      },
      gatewayReferenceId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      failureReason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      gatewayResponse: {
        type: Sequelize.JSONB, // JSON Binary for flexible schema
        allowNull: true,
      },
      amountCaptured: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      amountRefunded: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      idempotencyKey: {
        type: Sequelize.UUID,
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
    await queryInterface.addIndex('transactions', ['merchantId']);
    await queryInterface.addIndex('transactions', ['status']);
    await queryInterface.addIndex('transactions', ['customerId']);
    await queryInterface.addIndex('transactions', ['gatewayReferenceId']);
    await queryInterface.addIndex('transactions', ['idempotencyKey']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('transactions');
  }
};
```