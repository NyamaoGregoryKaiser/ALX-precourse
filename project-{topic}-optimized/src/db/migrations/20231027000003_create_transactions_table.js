/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('account_id').notNullable();
    table.enum('type', ['debit', 'credit', 'fee', 'refund']).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 3).notNullable(); // Should match account currency
    table.enum('status', ['pending', 'completed', 'failed', 'reversed', 'voided']).notNullable().defaultTo('pending');
    table.text('description');
    table.uuid('reference_id').nullable(); // For linking payments, refunds, etc. (idempotency key)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('account_id').references('id').inTable('accounts').onDelete('CASCADE');
    table.index(['account_id']); // For faster lookup of account transactions
    table.index(['reference_id']); // For faster lookup of related transactions (e.g., refunds)
    table.index(['status']); // For filtering by transaction status
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('transactions');
};