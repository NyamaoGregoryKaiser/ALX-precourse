```javascript
const { Sequelize, DataTypes } = require('sequelize');
const config = require('./config');
const logger = require('../utils/logger');

const dbConfig = config.env === 'test' ? {
    database: config.db.testName,
    username: config.db.user,
    password: config.db.password,
    host: config.db.host,
    dialect: config.db.dialect,
    port: config.db.port,
    logging: config.db.logging ? (msg) => logger.debug(msg) : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
} : {
    database: config.db.name,
    username: config.db.user,
    password: config.db.password,
    host: config.db.host,
    dialect: config.db.dialect,
    port: config.db.port,
    logging: config.db.logging ? (msg) => logger.debug(msg) : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};

const sequelize = new Sequelize(dbConfig);

// Test database connection
async function connectDB() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection has been established successfully.');
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        throw error;
    }
}

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Import models
db.User = require('../models/user.model')(sequelize, DataTypes);
db.Product = require('../models/product.model')(sequelize, DataTypes);
db.Category = require('../models/category.model')(sequelize, DataTypes);
db.Cart = require('../models/cart.model')(sequelize, DataTypes);
db.CartItem = require('../models/cartItem.model')(sequelize, DataTypes);
db.Order = require('../models/order.model')(sequelize, DataTypes);
db.OrderItem = require('../models/orderItem.model')(sequelize, DataTypes);
db.Review = require('../models/review.model')(sequelize, DataTypes);
db.Payment = require('../models/payment.model')(sequelize, DataTypes);

// Set up associations
Object.values(db).forEach(model => {
    if (model.associate) {
        model.associate(db);
    }
});

module.exports = db;
```