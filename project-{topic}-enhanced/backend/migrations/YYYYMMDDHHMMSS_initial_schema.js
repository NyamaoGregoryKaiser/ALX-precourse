```javascript
exports.up = function(knex) {
  return knex.schema
    .createTable('users', function(table) {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('email').notNullable().unique();
      table.string('password').notNullable(); // Hashed password
      table.enum('type', ['user', 'merchant', 'admin']).notNullable().defaultTo('user');
      table.enum('status', ['active', 'inactive', 'suspended']).notNullable().defaultTo('active');
      table.uuid('merchant_id').nullable(); // Link to merchant if type is 'merchant'
      table.timestamps(true, true); // created_at, updated_at
    })
    .createTable('merchants', function(table) {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE'); // Admin user for merchant
      table.string('name').notNullable();
      table.string('description').nullable();
      table.string('webhook_url').nullable(); // URL to send transaction notifications
      table.enum('status', ['active', 'inactive', 'suspended']).notNullable().defaultTo('active');
      table.timestamps(true, true);
    })
    .createTable('payment_methods', function(table) {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.enum('type', ['card', 'bank_account']).notNullable(); // e.g., 'card', 'bank_account'
      table.string('card_holder_name').nullable(); // Encrypted, if stored
      table.string('card_number').nullable(); // Encrypted, e.g., last 4 digits
      table.string('expiry_month').nullable(); // Encrypted
      table.string('expiry_year').nullable(); // Encrypted
      table.string('card_brand').nullable(); // e.g., 'Visa', 'Mastercard'
      table.string('fingerprint').nullable().unique(); // Token/fingerprint from gateway, for identifying cards without storing full details
      table.boolean('is_default').defaultTo(false);
      table.enum('status', ['active', 'inactive', 'expired']).notNullable().defaultTo('active');
      table.timestamps(true, true);

      table.unique(['user_id', 'fingerprint']); // A user cannot have the same card twice (by fingerprint)
    })
    .createTable('transactions', function(table) {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT'); // User who made the payment
      table.uuid('merchant_id').notNullable().references('id').inTable('merchants').onDelete('RESTRICT'); // Merchant receiving the payment
      table.uuid('payment_method_id').nullable().references('id').inTable('payment_methods').onDelete('SET NULL'); // Which method was used
      table.decimal('amount', 10, 2).notNullable();
      table.string('currency', 3).notNullable(); // ISO 4217, e.g., USD, EUR
      table.string('description').nullable();
      table.enum('type', ['charge', 'refund']).notNullable(); // Charge or Refund
      table.enum('status', ['pending', 'completed', 'failed', 'refunded', 'voided']).notNullable().defaultTo('pending');
      table.string('gateway_transaction_id').nullable(); // ID from external payment gateway
      table.uuid('parent_transaction_id').nullable().references('id').inTable('transactions').onDelete('SET NULL'); // For refunds
      table.jsonb('gateway_response').nullable(); // Full JSON response from gateway
      table.string('card_last_four', 4).nullable(); // Last 4 digits of card used (for display)
      table.string('card_brand').nullable();
      table.string('card_holder_name').nullable();
      table.timestamps(true, true);
    })
    .createTable('webhook_logs', function(table) {
      table.uuid('id').primary();
      table.uuid('merchant_id').notNullable().references('id').inTable('merchants').onDelete('CASCADE');
      table.string('event').notNullable(); // e.g., 'charge.succeeded', 'charge.failed'
      table.jsonb('payload').notNullable();
      table.string('url').notNullable();
      table.enum('status', ['sent', 'failed', 'retried']).notNullable();
      table.string('response').nullable();
      table.integer('retry_attempts').defaultTo(0);
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('webhook_logs')
    .dropTableIfExists('transactions')
    .dropTableIfExists('payment_methods')
    .dropTableIfExists('merchants')
    .dropTableIfExists('users');
};
```