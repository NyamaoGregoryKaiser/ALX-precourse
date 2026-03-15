const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'Customer' });
      Transaction.belongsTo(models.PaymentMethod, { foreignKey: 'paymentMethodId', as: 'PaymentMethod' });
    }
  }

  Transaction.init(
    {
      id: {
        type: DataTypes.STRING, // e.g., 'txn_123abc'
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      customerId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id',
        },
      },
      paymentMethodId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: 'payment_methods',
          key: 'id',
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0.01,
        },
      },
      currency: {
        type: DataTypes.STRING(3), // e.g., 'USD', 'EUR', 'GBP'
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('debit', 'credit'), // 'debit' for charges, 'credit' for refunds/payouts
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
      },
      metadata: {
        type: DataTypes.JSONB, // For additional unstructured data
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Transaction',
      tableName: 'transactions',
    }
  );

  return Transaction;
};