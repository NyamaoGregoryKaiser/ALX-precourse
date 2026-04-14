```javascript
const config = require('../config');

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
    development: {
        client: config.database.client,
        connection: config.database.connection,
        pool: config.database.pool,
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds',
        },
        useNullAsDefault: true,
    },

    production: {
        client: config.database.client,
        connection: {
            ...config.database.connection,
            ssl: { rejectUnauthorized: false }, // Adjust as needed for your production SSL setup
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds',
        },
        useNullAsDefault: true,
    },
};
```