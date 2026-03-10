```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

const Media = sequelize.define('Media', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isUrl: true,
    }
  },
  altText: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  timestamps: true,
});

Media.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

module.exports = Media;
```