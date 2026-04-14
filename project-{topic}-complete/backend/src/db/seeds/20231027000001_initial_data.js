```javascript
const bcrypt = require('bcryptjs');
const config = require('../../config');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
    // Deletes ALL existing entries
    await knex('job_logs').del();
    await knex('scraped_data').del();
    await knex('scraping_jobs').del();
    await knex('users').del();

    // Seed admin user
    const passwordHash = await bcrypt.hash(config.adminPassword, 10);
    const [adminUser] = await knex('users').insert(
        {
            username: 'admin',
            email: config.adminEmail,
            password_hash: passwordHash,
            role: 'admin',
        },
        ['id']
    );

    // Seed a regular user
    const userPasswordHash = await bcrypt.hash('userpassword123', 10);
    const [regularUser] = await knex('users').insert(
        {
            username: 'testuser',
            email: 'user@example.com',
            password_hash: userPasswordHash,
            role: 'user',
        },
        ['id']
    );

    // Seed some scraping jobs for the admin
    const [job1] = await knex('scraping_jobs').insert(
        {
            user_id: adminUser.id,
            name: 'Example Static Blog Scraper',
            start_url: 'https://blog.scrapinghub.com/category/web-scraping',
            selectors: JSON.stringify({
                title: 'h2.entry-title a',
                url: 'h2.entry-title a[href]',
                excerpt: '.entry-summary p',
                author: '.author a',
            }),
            scrape_type: 'static',
            schedule_cron: '0 0 * * *', // Daily at midnight
            is_active: true,
            status: 'pending',
        },
        ['id']
    );

    const [job2] = await knex('scraping_jobs').insert(
        {
            user_id: adminUser.id,
            name: 'Example Dynamic Product Page Scraper',
            start_url: 'https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics',
            selectors: JSON.stringify({
                productName: '.a-link-normal .p13n-sc-css-line-clamp-3',
                productPrice: '.a-price-whole',
                productRating: '.a-icon-alt',
            }),
            scrape_type: 'dynamic',
            schedule_cron: '0 */6 * * *', // Every 6 hours
            is_active: false, // Start inactive
            status: 'pending',
        },
        ['id']
    );

    // Seed some scraped data for job1
    await knex('scraped_data').insert([
        {
            job_id: job1.id,
            url: 'https://blog.scrapinghub.com/post/example1',
            data: JSON.stringify({
                title: 'Scraped Article 1',
                url: 'https://blog.scrapinghub.com/post/example1',
                excerpt: 'This is an excerpt from scraped article 1.',
                author: 'Admin User',
            }),
        },
        {
            job_id: job1.id,
            url: 'https://blog.scrapinghub.com/post/example2',
            data: JSON.stringify({
                title: 'Scraped Article 2',
                url: 'https://blog.scrapinghub.com/post/example2',
                excerpt: 'This is an excerpt from scraped article 2.',
                author: 'Another Author',
            }),
        },
    ]);

    // Seed a job log for job1
    await knex('job_logs').insert({
        job_id: job1.id,
        level: 'info',
        message: 'Job started successfully.',
    });
};
```