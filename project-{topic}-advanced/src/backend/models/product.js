```javascript
'use strict';
const { Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Product.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'A product with this name already exists!'
      },
      validate: {
        notEmpty: {
          msg: 'Product name cannot be empty!'
        },
        len: {
          args: [3, 255],
          msg: 'Product name must be between 3 and 255 characters.'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Product description cannot be empty!'
        },
        len: {
          args: [10, 2000],
          msg: 'Product description must be between 10 and 2000 characters.'
        }
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {
          msg: 'Price must be a valid decimal number.'
        },
        min: {
          args: [0],
          msg: 'Price cannot be negative.'
        }
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: {
          msg: 'Quantity must be an integer.'
        },
        min: {
          args: [0],
          msg: 'Quantity cannot be negative.'
        }
      }
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Category must be less than 100 characters.'
        }
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'Image URL must be a valid URL.'
        }
      }
    }
  }, {
    sequelize,
    modelName: 'Product',
    hooks: {
      beforeCreate: async (product) => {
        product.id = uuidv4(); // Ensure UUID is generated
      }
    }
  });
  return Product;
};
```