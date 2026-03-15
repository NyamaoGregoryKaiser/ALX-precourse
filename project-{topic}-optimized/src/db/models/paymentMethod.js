const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PaymentMethod extends Model {
    static associate(models) {
      PaymentMethod.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
      PaymentMethod.hasMany(models.Transaction, { foreignKey: 'paymentMethodId', as: 'transactions' });
    }
  }

  PaymentMethod.init(
    {
      id: {
        type: DataTypes.STRING, // e.g., 'pm_xyz789'
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
      type: {
        type: DataTypes.ENUM('card', 'bank_transfer', 'mobile_money', 'wallet'),
        allowNull: false,
      },
      details: {
        type: DataTypes.JSONB, // Stores encrypted card/bank details (e.g., last4, expiry, bank name)
        allowNull: false,
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      expiresAt: {
        type: DataTypes.DATE, // Relevant for cards
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'PaymentMethod',
      tableName: 'payment_methods',
    }
  );

  return PaymentMethod;
};