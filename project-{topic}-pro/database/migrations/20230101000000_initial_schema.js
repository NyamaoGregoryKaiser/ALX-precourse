const { v4: uuidv4 } = require('uuid');

exports.up = async function(knex) {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.enum('role', ['user', 'admin']).notNullable().defaultTo('user');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('accountNumber').unique().notNullable(); // e.g., NGN-1234567890
    table.decimal('balance', 18, 2).notNullable().defaultTo(0);
    table.enum('currency', ['USD', 'EUR', 'NGN']).notNullable().defaultTo('NGN');
    table.enum('status', ['active', 'inactive', 'suspended']).notNullable().defaultTo('active');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // Add index for faster lookup by userId
    table.index(['userId']);
  });

  await knex.schema.createTable('payment_methods', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('type', ['card', 'bank_account']).notNullable(); // e.g., 'card', 'bank_account'
    table.string('externalId').notNullable(); // ID from payment gateway (e.g., Stripe's payment_method_id)
    table.string('last4', 4).nullable(); // Last 4 digits of card/account
    table.string('brand', 50).nullable(); // e.g., 'Visa', 'Mastercard', 'GTBank'
    table.integer('expiryMonth').nullable();
    table.integer('expiryYear').nullable();
    table.string('fingerprint').nullable(); // For identifying unique payment methods (e.g., Stripe's card fingerprint)
    table.boolean('isDefault').defaultTo(false);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    table.unique(['userId', 'externalId']); // A user should have unique external payment methods
    table.index(['userId', 'type']);
  });

  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('accountId').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.string('reference').unique().notNullable(); // Internal unique transaction reference
    table.string('externalReference').nullable(); // Reference from external payment gateway
    table.decimal('amount', 18, 2).notNullable();
    table.enum('currency', ['USD', 'EUR', 'NGN']).notNullable();
    table.enum('type', ['credit', 'debit']).notNullable();
    table.enum('status', ['pending', 'completed', 'failed', 'reversed', 'refunded', 'partially_refunded']).notNullable().defaultTo('pending');
    table.string('description', 500).nullable();
    table.jsonb('metadata').nullable(); // Store additional transaction details (e.g., gateway response)
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    table.index(['userId', 'accountId', 'status']);
    table.index(['externalReference']); // For quick lookup when processing webhooks
  });

  // Enable uuid-ossp extension for uuid_generate_v4()
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('payment_methods');
  await knex.schema.dropTableIfExists('accounts');
  await knex.schema.dropTableIfExists('users');
};