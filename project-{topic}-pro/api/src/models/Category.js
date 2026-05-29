```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const logger = require('../config/logger');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [2, 100],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
}, {
  tableName: 'categories',
  hooks: {
    afterCreate: (category, options) => {
      logger.info(`Category created: ${category.name}`);
    },
  },
});

module.exports = Category;
```