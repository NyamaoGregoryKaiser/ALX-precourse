```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { PRODUCT_AVAILABILITY } = require('../config/constants');
const logger = require('../config/logger');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0,
    },
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isInt: true,
      min: 0,
    },
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
  weight: {
    type: DataTypes.DECIMAL(10, 2), // in kg or lbs
    allowNull: true,
    validate: {
      isDecimal: true,
      min: 0,
    },
  },
  dimensions: {
    type: DataTypes.JSONB, // { length: "cm", width: "cm", height: "cm" }
    allowNull: true,
  },
  availability: {
    type: DataTypes.ENUM(Object.values(PRODUCT_AVAILABILITY)),
    defaultValue: PRODUCT_AVAILABILITY.IN_STOCK,
    allowNull: false,
  },
  // Foreign Key for Category
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true, // A product can exist without a category, or have a default 'Uncategorized'
  },
}, {
  tableName: 'products',
  indexes: [
    {
      fields: ['categoryId'],
    },
    {
      fields: ['name'],
      unique: true, // Product names should ideally be unique or have unique identifiers
    },
    {
      fields: ['price'],
    },
  ],
  hooks: {
    beforeUpdate: (product) => {
      // Automatically update availability based on stock
      if (product.changed('stockQuantity')) {
        if (product.stockQuantity > 0) {
          product.availability = PRODUCT_AVAILABILITY.IN_STOCK;
        } else {
          product.availability = PRODUCT_AVAILABILITY.OUT_OF_STOCK;
        }
      }
    },
    afterCreate: (product, options) => {
      logger.info(`Product created: ${product.name}, ID: ${product.id}`);
    },
  },
});

module.exports = Product;
```