const Sequelize = require('sequelize');
const config = require('../config/config');
const logger = require('../utils/logger');

const sequelizeConfig = config.sequelize;

const sequelize = new Sequelize(
  sequelizeConfig.database,
  sequelizeConfig.username,
  sequelizeConfig.password,
  {
    host: sequelizeConfig.host,
    port: sequelizeConfig.port,
    dialect: sequelizeConfig.dialect,
    logging: sequelizeConfig.logging,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    // dialectOptions: {
    //   ssl: {
    //     require: true, // This will require SSL connection
    //     rejectUnauthorized: false, // For development, set to true in production
    //   }
    // }
  }
);

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.User = require('./user.model')(sequelize, Sequelize);
db.Project = require('./project.model')(sequelize, Sequelize);
db.Task = require('./task.model')(sequelize, Sequelize);
db.Comment = require('./comment.model')(sequelize, Sequelize);
db.Token = require('./token.model')(sequelize, Sequelize); // For refresh tokens

// Define associations
Object.values(db).forEach((model) => {
  if (model.associate) {
    model.associate(db);
  }
});

module.exports = db;