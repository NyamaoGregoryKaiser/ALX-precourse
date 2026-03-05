const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('scraped_items').del();
  await knex('scrape_jobs').del();
  await knex('scrapers').del();
  await knex('users').del();

  const passwordHash = await bcrypt.hash('password123', 10);

  // Insert a user
  const [userId] = await knex('users').insert({
    username: 'testuser',
    email: 'test@example.com',
    password: passwordHash,
  }).returning('id');

  // Insert an example scraper
  const [scraperId] = await knex('scrapers').insert({
    user_id: userId.id,
    name: 'Example Static Scraper',
    description: 'Scrapes titles and links from a simple blog page.',
    start_url: 'https://news.ycombinator.com/', // Using Hacker News as a simple static example
    selectors_json: JSON.stringify({
      item: 'tr.athing',
      fields: {
        title: '.titleline > a',
        url: { selector: '.titleline > a', attr: 'href' },
        points: '.score',
        author: '.hnuser'
      }
    }),
    schedule_cron: '0 */4 * * *', // Every 4 hours
    is_active: true,
    scraping_method: 'cheerio'
  }).returning('id');

  console.log(`Seeded user with ID: ${userId.id}`);
  console.log(`Seeded scraper with ID: ${scraperId.id}`);
};