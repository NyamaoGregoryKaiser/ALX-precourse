const { knex } = require('./src/utils/db'); // Assuming db.js exports knex instance

afterAll(async () => {
  // Disconnect from the database after all tests are done
  await knex.destroy();
});