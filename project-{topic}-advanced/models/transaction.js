```javascript
const { TRANSACTION_STATUS, TRANSACTION_TYPE } = require('../src/utils/constants');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
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
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    sourceAccountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT', // Prevent deleting account with active transactions
    },
    destinationAccountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TRANSACTION_STATUS)),
      defaultValue: TRANSACTION_STATUS.PENDING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TRANSACTION_TYPE)),
      defaultValue: TRANSACTION_TYPE.PAYMENT,
      allowNull: false,
    },
    gatewayRefId: {
      type: DataTypes.STRING,
      allowNull: true, // Reference ID from external payment gateway
      unique: true, // Gateway reference IDs should be unique for idempotency
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true, // For failure reasons, refund notes, etc.
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true, // Timestamp when transaction reached final state (COMPLETED/FAILED/REFUNDED)
    },
  }, {
    timestamps: true,
    indexes: [
      {
        unique: false,
        fields: ['userId'],
      },
      {
        unique: false,
        fields: ['sourceAccountId'],
      },
      {
        unique: false,
        fields: ['destinationAccountId'],
      },
      {
        unique: false,
        fields: ['status'],
      },
      {
        unique: true,
        fields: ['gatewayRefId'],
        where: {
          gateway_ref_id: {
            [DataTypes.Op.ne]: null // Only unique if not null
          }
        }
      }
    ]
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    Transaction.belongsTo(models.Account, {
      foreignKey: 'sourceAccountId',
      as: 'sourceAccount',
    });
    Transaction.belongsTo(models.Account, {
      foreignKey: 'destinationAccountId',
      as: 'destinationAccount',
    });
  };

  return Transaction;
};
```