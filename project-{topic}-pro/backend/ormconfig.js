```javascript
// This file is used by TypeORM CLI for migrations.
// It needs to be a .js file as ts-node might not be configured for CLI directly.
// We are building the project first and then pointing to the compiled JS files.

const dotenv = require('dotenv');
dotenv.config(); // Load environment variables

module.exports = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: false, // Set to false for production; migrations handle schema changes
  logging: true, // Enable logging of SQL queries
  entities: ['dist/**/*.entity.js'], // Path to your compiled entity files
  migrations: ['dist/src/database/migrations/*.js'], // Path to your compiled migration files
  subscribers: ['dist/**/*.subscriber.js'],
  cli: {
    migrationsDir: 'src/database/migrations', // Path for TypeORM CLI to create new migrations
    entitiesDir: 'src/**/*.entity.ts', // Path for TypeORM CLI to recognize entities
  },
};
```