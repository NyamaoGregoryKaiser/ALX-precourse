```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tag = sequelize.define('Tag', {
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
      len: [2, 50]
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
}, {
  timestamps: true,
  hooks: {
    beforeValidate: (tag, options) => {
      if (tag.name && !tag.slug) {
        tag.slug = tag.name.toLowerCase()
                           .replace(/[^a-z0-9\s-]/g, '')
                           .replace(/\s+/g, '-')
                           .replace(/-+/g, '-');
      }
    }
  }
});

module.exports = Tag;
```