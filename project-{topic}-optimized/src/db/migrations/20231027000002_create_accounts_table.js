/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable();
    table.string('currency', 3).notNullable().defaultTo('USD'); // e.g., USD, EUR, GBP
    table.decimal('balance', 15, 2).notNullable().defaultTo(0.00); // 15 total digits, 2 after decimal
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.unique(['user_id', 'currency']); // A user can have only one account per currency
    table.index(['user_id']); // Index for faster lookup by user_id
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('accounts');
};