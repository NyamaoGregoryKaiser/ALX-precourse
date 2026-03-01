```javascript
// src/models/index.js
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('../config/config').database;
const logger = require('../utils/logger');

const basename = path.basename(__filename);
const db = {};

// ALX Principle: Modularity and Scalability
// Dynamically load all model files to keep the index clean.
const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: (msg) => logger.debug(`[Sequelize] ${msg}`), // Integrate Sequelize logs with Winston
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    // Operators alias disabled for security and consistency
    operatorsAliases: false,
});

fs
    .readdirSync(__dirname)
    .filter(file => {
        return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js') && (file.indexOf('.model.js') !== -1);
    })
    .forEach(file => {
        const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });

Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
```