/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Users Table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username').unique().notNullable();
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Scrapers Table
  await knex.schema.createTable('scrapers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('description');
    table.string('start_url').notNullable();
    table.string('selectors_json', 2048).notNullable(); // Store JSON string for selectors
    table.string('schedule_cron'); // Cron string for scheduling
    table.boolean('is_active').defaultTo(true);
    table.enum('scraping_method', ['cheerio', 'puppeteer']).defaultTo('cheerio'); // Cheerio for static, Puppeteer for dynamic
    table.timestamp('last_run');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'name']); // User cannot have two scrapers with the same name
  });

  // Scrape Jobs Table
  await knex.schema.createTable('scrape_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('scraper_id').notNullable().references('id').inTable('scrapers').onDelete('CASCADE');
    table.timestamp('start_time').defaultTo(knex.fn.now());
    table.timestamp('end_time');
    table.enum('status', ['pending', 'running', 'completed', 'failed', 'cancelled']).defaultTo('pending');
    table.string('error_message', 1024);
    table.integer('items_scraped').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Scraped Items Table
  await knex.schema.createTable('scraped_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('job_id').notNullable().references('id').inTable('scrape_jobs').onDelete('CASCADE');
    table.uuid('scraper_id').notNullable().references('id').inTable('scrapers').onDelete('CASCADE'); // Denormalized for easier query
    table.jsonb('data').notNullable(); // Store JSON object of scraped data
    table.string('url').notNullable(); // URL from which the item was scraped
    table.timestamp('scraped_at').defaultTo(knex.fn.now());
  });

  // Add indexes for performance
  await knex.schema.alterTable('scraped_items', (table) => {
    table.index('job_id');
    table.index('scraper_id');
    table.index('scraped_at');
  });

  await knex.schema.alterTable('scrape_jobs', (table) => {
    table.index('scraper_id');
    table.index('status');
    table.index('start_time');
  });

  await knex.schema.alterTable('scrapers', (table) => {
    table.index('user_id');
    table.index('is_active');
    table.index('last_run');
  });

  await knex.schema.alterTable('users', (table) => {
    table.index('username');
    table.index('email');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('scraped_items');
  await knex.schema.dropTableIfExists('scrape_jobs');
  await knex.schema.dropTableIfExists('scrapers');
  await knex.schema.dropTableIfExists('users');
};