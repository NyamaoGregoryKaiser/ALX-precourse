const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Project = require('./project');
const User = require('./user');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Task title cannot be empty.' },
      len: { args: [3, 200], msg: 'Task title must be between 3 and 200 characters.' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'in-progress', 'completed', 'blocked'),
    defaultValue: 'pending',
    allowNull: false,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Project,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  assignedToId: {
    type: DataTypes.UUID,
    allowNull: true, // A task might not be assigned immediately
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'SET NULL',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
    onDelete: 'RESTRICT', // Prevent deleting user if they created tasks
  },
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['projectId']
    },
    {
      fields: ['assignedToId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['dueDate']
    }
  ]
});

// Associations
Task.belongsTo(Project, { as: 'project', foreignKey: 'projectId' });
Project.hasMany(Task, { as: 'tasks', foreignKey: 'projectId' });

Task.belongsTo(User, { as: 'assignedTo', foreignKey: 'assignedToId' });
User.hasMany(Task, { as: 'assignedTasks', foreignKey: 'assignedToId' });

Task.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
User.hasMany(Task, { as: 'createdTasks', foreignKey: 'createdBy' });

module.exports = Task;