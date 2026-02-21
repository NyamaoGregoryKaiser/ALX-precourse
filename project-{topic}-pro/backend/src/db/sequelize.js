const { Sequelize } = require('sequelize');
const config = require('../config/config');
const logger = require('../utils/logger');

// Dynamically select the database URL based on NODE_ENV
const databaseUrl = config.env === 'test'
  ? process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/ml_utilities_test_db'
  : config.database.url;

const sequelize = new Sequelize(databaseUrl, {
  dialect: config.database.dialect,
  logging: config.database.logging,
  // Additional options for production
  dialectOptions: {
    // For production, if using SSL, uncomment and configure:
    // ssl: {
    //   require: true,
    //   rejectUnauthorized: false, // Set to true for strict SSL certificate validation
    // },
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Import models to ensure they are registered with Sequelize instance
// These imports are necessary for `sequelize.sync()` to create tables
// and for relationships to be defined before any operations.
require('../models/user.model')(sequelize);
require('../models/project.model')(sequelize);
require('../models/mlTask.model')(sequelize);

// Define associations after all models are loaded
const { User, Project, MLTask } = sequelize.models;

// User - Project: One-to-Many
User.hasMany(Project, {
  foreignKey: 'userId',
  as: 'projects',
  onDelete: 'CASCADE',
});
Project.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Project - MLTask: One-to-Many
Project.hasMany(MLTask, {
  foreignKey: 'projectId',
  as: 'mlTasks',
  onDelete: 'CASCADE',
});
MLTask.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project',
});

module.exports = {
  sequelize,
  ...sequelize.models, // Export all models directly
};