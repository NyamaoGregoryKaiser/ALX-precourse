const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      Customer.hasMany(models.Transaction, { foreignKey: 'customerId', as: 'transactions' });
      Customer.hasMany(models.PaymentMethod, { foreignKey: 'customerId', as: 'paymentMethods' });
      Customer.hasMany(models.WebhookEndpoint, { foreignKey: 'customerId', as: 'webhookEndpoints' });
    }

    async correctPassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    }
  }

  Customer.init(
    {
      id: {
        type: DataTypes.STRING, // e.g., 'cust_abc123'
        primaryKey: true,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        select: false, // Do not return password by default
      },
      role: {
        type: DataTypes.ENUM('customer', 'admin'),
        defaultValue: 'customer',
        allowNull: false,
      },
      passwordChangedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'Customer',
      tableName: 'customers',
      hooks: {
        beforeCreate: async (customer) => {
          customer.password = await bcrypt.hash(customer.password, 12);
        },
        beforeUpdate: async (customer, options) => {
          if (customer.changed('password')) {
            customer.password = await bcrypt.hash(customer.password, 12);
            customer.passwordChangedAt = new Date();
          }
        },
      },
    }
  );

  return Customer;
};