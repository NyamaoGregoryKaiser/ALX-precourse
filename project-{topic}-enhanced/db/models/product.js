```javascript
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      // define association here
      // Example: Product.belongsTo(models.User, { foreignKey: 'userId', as: 'seller' });
    }
  }
  Product.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [3, 100],
          msg: "Product name must be between 3 and 100 characters."
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [10, 500],
          msg: "Description must be between 10 and 500 characters."
        }
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: {
          args: [0.01],
          msg: "Price must be a positive number."
        }
      }
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: "Stock cannot be negative."
        }
      }
    }
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true
  });
  return Product;
};
```