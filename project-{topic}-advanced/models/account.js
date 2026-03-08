```javascript
const { ACCOUNT_TYPE } = require('../src/utils/constants');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Account = sequelize.define('Account', {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users', // refers to table name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(ACCOUNT_TYPE)),
      defaultValue: ACCOUNT_TYPE.CHECKING,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3), // e.g., 'USD', 'EUR'
      allowNull: false,
    },
    balance: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    timestamps: true,
  });

  Account.associate = (models) => {
    Account.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    Account.hasMany(models.Transaction, {
      foreignKey: 'sourceAccountId',
      as: 'sentTransactions',
    });
    Account.hasMany(models.Transaction, {
      foreignKey: 'destinationAccountId',
      as: 'receivedTransactions',
    });
  };

  return Account;
};
```