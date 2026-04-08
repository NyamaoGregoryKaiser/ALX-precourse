const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: {
          args: [3, 100],
          msg: 'Product name must be between 3 and 100 characters',
        },
        notEmpty: {
          msg: 'Product name cannot be empty',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: {
          args: [10, 1000],
          msg: 'Description must be between 10 and 1000 characters',
        },
        notEmpty: {
          msg: 'Description cannot be empty',
        },
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Price must be a decimal number',
        },
        min: {
          args: [0],
          msg: 'Price cannot be negative',
        },
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: {
          msg: 'Stock must be an integer',
        },
        min: {
          args: [0],
          msg: 'Stock cannot be negative',
        },
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users', // Refers to the table name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'products',
    timestamps: true,
    indexes: [
      {
        fields: ['name'],
      },
      {
        fields: ['userId'],
      },
    ],
  });

  return Product;
};
```