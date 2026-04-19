const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      args: true,
      msg: 'Project name must be unique.'
    },
    validate: {
      notEmpty: { msg: 'Project name cannot be empty.' },
      len: { args: [3, 100], msg: 'Project name must be between 3 and 100 characters.' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'on-hold', 'completed', 'archived'),
    defaultValue: 'active',
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'CASCADE',
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['ownerId']
    },
    {
      fields: ['status']
    }
  ]
});

// Associations
Project.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
User.hasMany(Project, { as: 'ownedProjects', foreignKey: 'ownerId' });

module.exports = Project;