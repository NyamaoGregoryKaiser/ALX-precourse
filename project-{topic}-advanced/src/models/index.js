```javascript
const { Sequelize } = require('sequelize');
const config = require('../../config/config');
const logger = require('../utils/logger');

const sequelize = new Sequelize(config.database.url, {
  dialect: config.database.dialect,
  logging: config.database.logging ? (msg) => logger.debug(msg) : false,
  // Other Sequelize options for production:
  // dialectOptions: {
  //   ssl: {
  //     require: true,
  //     rejectUnauthorized: false, // For self-signed certs in dev, use true in prod with valid cert
  //   },
  // },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Load models
db.User = require('./user.model')(sequelize);
db.Product = require('./product.model')(sequelize);
db.Order = require('./order.model')(sequelize);

// Apply associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
```