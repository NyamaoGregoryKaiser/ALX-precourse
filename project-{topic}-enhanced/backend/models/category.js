```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    }
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
  }
}, {
  timestamps: true,
  hooks: {
    beforeValidate: (category, options) => {
      if (category.name && !category.slug) {
        category.slug = category.name.toLowerCase()
                                 .replace(/[^a-z0-9\s-]/g, '')
                                 .replace(/\s+/g, '-')
                                 .replace(/-+/g, '-');
      }
    }
  }
});

module.exports = Category;
```