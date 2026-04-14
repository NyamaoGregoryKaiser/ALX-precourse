```javascript
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // Users table
    await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').notNullable().unique();
        table.string('email').notNullable().unique();
        table.string('password_hash').notNullable();
        table.enum('role', ['user', 'admin']).notNullable().defaultTo('user');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    // ScrapingJobs table
    await knex.schema.createTable('scraping_jobs', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable();
        table.string('name').notNullable();
        table.string('start_url').notNullable();
        table.jsonb('selectors').notNullable(); // JSONB for dynamic selectors: { title: 'h1', description: '.product-desc' }
        table.enum('scrape_type', ['static', 'dynamic']).notNullable().defaultTo('static'); // Static (cheerio) or Dynamic (puppeteer)
        table.string('schedule_cron').nullable(); // E.g., '0 * * * *' for hourly
        table.boolean('is_active').defaultTo(true);
        table.enum('status', ['pending', 'running', 'completed', 'failed', 'scheduled']).defaultTo('pending');
        table.timestamp('last_run').nullable();
        table.timestamp('next_run').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    });

    // ScrapedData table
    await knex.schema.createTable('scraped_data', (table) => {
        table.increments('id').primary();
        table.integer('job_id').unsigned().notNullable();
        table.string('url').notNullable();
        table.jsonb('data').notNullable(); // JSONB to store the scraped data dynamically
        table.timestamp('scraped_at').defaultTo(knex.fn.now());

        table.foreign('job_id').references('id').inTable('scraping_jobs').onDelete('CASCADE');
        // Add index for faster querying by job_id or url
        table.index(['job_id', 'url']);
    });

    // JobLogs table
    await knex.schema.createTable('job_logs', (table) => {
        table.increments('id').primary();
        table.integer('job_id').unsigned().notNullable();
        table.enum('level', ['info', 'warn', 'error']).notNullable();
        table.text('message').notNullable();
        table.timestamp('timestamp').defaultTo(knex.fn.now());

        table.foreign('job_id').references('id').inTable('scraping_jobs').onDelete('CASCADE');
        table.index('job_id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('job_logs');
    await knex.schema.dropTableIfExists('scraped_data');
    await knex.schema.dropTableIfExists('scraping_jobs');
    await knex.schema.dropTableIfExists('users');
};
```